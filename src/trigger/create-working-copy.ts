import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { logger, task } from "@trigger.dev/sdk";
import { z } from "zod";

import { runFfmpeg } from "@/features/media/ffmpeg";
import { probeMedia } from "@/features/media/probe";
import { buildWorkingCopyArgs, needsWorkingCopy } from "@/features/media/working-copy";
import { isWorkingCopyStorageConfigured, uploadWorkingCopy } from "@/lib/aws/working-copy-storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const payloadSchema = z.object({ projectId: z.uuid() });

const projectSchema = z.object({
  user_id: z.uuid(),
  source_video_key: z.string().nullable(),
  working_video_key: z.string().nullable(),
});

const SIGNED_URL_SECONDS = 60 * 60;

// Makes the 1080p H.264 copy the export reads instead of the original upload (cheaper to render,
// same picture). Never blocks anything: with no copy, the export simply reads the original.
export const createWorkingCopy = task({
  id: "create-working-copy",
  maxDuration: 60 * 20,
  retry: { maxAttempts: 1 },
  run: async (payload: unknown) => {
    const { projectId } = payloadSchema.parse(payload);
    if (!isWorkingCopyStorageConfigured()) return { skipped: "not_configured" };

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("projects")
      .select("user_id, source_video_key, working_video_key")
      .eq("id", projectId)
      .single();
    if (error) throw error;
    const project = projectSchema.parse(data);
    if (!project.source_video_key) return { skipped: "no_source" };
    if (project.working_video_key) return { skipped: "already_done" };

    const workDir = await mkdtemp(join(tmpdir(), "working-copy-"));
    try {
      const { data: signed, error: signError } = await supabase.storage
        .from("videos")
        .createSignedUrl(project.source_video_key, SIGNED_URL_SECONDS);
      if (signError || !signed) throw new Error("video_unavailable");

      const info = await probeMedia(signed.signedUrl);
      if (!needsWorkingCopy(info, project.source_video_key)) return { skipped: "not_needed" };

      const outputPath = join(workDir, "working.mp4");
      await runFfmpeg(buildWorkingCopyArgs(signed.signedUrl, outputPath, info));

      const key = `${project.user_id}/${projectId}/working.mp4`;
      await uploadWorkingCopy(key, outputPath);

      const { error: updateError } = await supabase
        .from("projects")
        .update({ working_video_key: key })
        .eq("id", projectId);
      if (updateError) throw updateError;
      return { created: true, key };
    } catch (caught) {
      logger.error("Working copy failed", { projectId, error: String(caught) });
      return { failed: true };
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  },
});
