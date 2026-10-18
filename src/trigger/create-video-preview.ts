import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { logger, task } from "@trigger.dev/sdk";
import { z } from "zod";

import { buildPreviewArgs, isBrowserSafe } from "@/features/media/preview";
import { probeMedia } from "@/features/media/probe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const payloadSchema = z.object({ projectId: z.uuid() });

const projectSchema = z.object({
  user_id: z.uuid(),
  source_video_key: z.string().nullable(),
});

const SIGNED_URL_SECONDS = 60 * 60;

function runFfmpeg(args: string[], ffmpegPath = process.env.FFMPEG_PATH ?? "ffmpeg") {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, ["-hide_banner", "-loglevel", "error", ...args]);
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => (stderr = (stderr + chunk.toString()).slice(-2000)));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg_failed: ${stderr}`)),
    );
  });
}

// Makes sure every video can be played in any browser: keeps the source when it is already
// browser-safe, otherwise converts it to H.264/AAC (HDR tone-mapped). The original is never touched.
export const createVideoPreview = task({
  id: "create-video-preview",
  maxDuration: 60 * 15,
  retry: { maxAttempts: 1 },
  run: async (payload: unknown) => {
    const { projectId } = payloadSchema.parse(payload);
    const supabase = createSupabaseAdminClient();

    // Atomic claim: a second trigger (double click, page reload) finds nothing to claim and stops.
    const { data: claimed, error: claimError } = await supabase
      .from("projects")
      .update({ preview_status: "processing" })
      .eq("id", projectId)
      .in("preview_status", ["pending", "failed"])
      .not("source_video_key", "is", null)
      .select("user_id, source_video_key");
    if (claimError) throw claimError;
    if (claimed.length === 0) {
      logger.info("Nothing to do for this project", { projectId });
      return { skipped: true };
    }
    const project = projectSchema.parse(claimed[0]);
    const sourceKey = project.source_video_key;
    if (!sourceKey) throw new Error("no_source");

    const workDir = await mkdtemp(join(tmpdir(), "preview-"));
    try {
      const { data: signed, error: signError } = await supabase.storage
        .from("videos")
        .createSignedUrl(sourceKey, SIGNED_URL_SECONDS);
      if (signError || !signed) throw new Error("video_unavailable");

      const info = await probeMedia(signed.signedUrl);

      let previewKey = sourceKey;
      let converted = false;
      if (!isBrowserSafe(info, sourceKey)) {
        const outputPath = join(workDir, "preview.mp4");
        await runFfmpeg(buildPreviewArgs(signed.signedUrl, outputPath, info));

        previewKey = `${project.user_id}/${projectId}/preview.mp4`;
        const { error: uploadError } = await supabase.storage
          .from("videos")
          .upload(previewKey, await readFile(outputPath), {
            contentType: "video/mp4",
            upsert: true,
          });
        if (uploadError) throw uploadError;
        converted = true;
      }

      const { error: updateError } = await supabase
        .from("projects")
        .update({ preview_status: "ready", preview_video_key: previewKey })
        .eq("id", projectId);
      if (updateError) throw updateError;

      return { converted, previewKey };
    } catch (error) {
      logger.error("Preview creation failed", { projectId, error: String(error) });
      await supabase.from("projects").update({ preview_status: "failed" }).eq("id", projectId);
      return { failed: true };
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  },
});
