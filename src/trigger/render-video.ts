import { getRenderProgress, renderMediaOnLambda, type AwsRegion } from "@remotion/lambda/client";
import { logger, task, wait } from "@trigger.dev/sdk";
import { z } from "zod";

import { EXPORT_COMPOSITION_ID } from "@/features/captions/remotion/export-props";
import {
  canExport4k,
  exportCost,
  exportOptionsSchema,
  exportSize,
} from "@/features/export/options";
import { chooseRenderSource } from "@/features/export/render-source";
import { transcriptWordSchema } from "@/features/transcription/types";
import { signWorkingCopyUrl } from "@/lib/aws/working-copy-storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const payloadSchema = z.object({ jobId: z.uuid() });

const jobSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  project_id: z.uuid(),
  status: z.string(),
  options: exportOptionsSchema,
});

const projectSchema = z.object({
  title: z.string(),
  source_video_key: z.string().nullable(),
  working_video_key: z.string().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  duration_s: z.coerce.number().positive().nullable(),
  caption_style: z.unknown(),
});

const lambdaConfigSchema = z.object({
  region: z.string().min(1),
  functionName: z.string().min(1),
  serveUrl: z.url(),
});

const POLL_SECONDS = 5;
const MAX_POLLS = 360;
// The source link must outlive the whole render (Lambda reads the video until the last frame).
const SIGNED_URL_SECONDS = 3 * 60 * 60;

// Known, user-facing failure reasons. Anything else is reported as "unknown".
class JobError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function lambdaConfig() {
  const parsed = lambdaConfigSchema.safeParse({
    region: process.env.REMOTION_AWS_REGION,
    functionName: process.env.REMOTION_FUNCTION_NAME,
    serveUrl: process.env.REMOTION_SERVE_URL,
  });
  if (!parsed.success) throw new JobError("render_not_configured");
  return { ...parsed.data, region: parsed.data.region as AwsRegion };
}

// File name offered when the video is downloaded: the project title, without characters that
// browsers or file systems refuse.
function fileName(title: string): string {
  const clean = title
    .replace(/[^\p{L}\p{N} _-]+/gu, "")
    .trim()
    .slice(0, 80);
  return `${clean || "video"}.mp4`;
}

export const renderVideo = task({
  id: "render-video",
  maxDuration: 60 * 40,
  // Retrying could pay AWS twice: failures are handled (and refunded) explicitly instead.
  retry: { maxAttempts: 1 },
  run: async (payload: unknown, { ctx }) => {
    const { jobId } = payloadSchema.parse(payload);
    const supabase = createSupabaseAdminClient();

    const updateJob = async (fields: Record<string, unknown>) => {
      const { error } = await supabase.from("jobs").update(fields).eq("id", jobId);
      if (error) throw error;
    };

    const { data: rawJob, error: jobError } = await supabase
      .from("jobs")
      .select("id, user_id, project_id, status, options")
      .eq("id", jobId)
      .eq("type", "render")
      .single();
    if (jobError) throw jobError;
    const job = jobSchema.parse(rawJob);
    if (job.status !== "queued") {
      logger.warn("Job is not queued, skipping", { jobId, status: job.status });
      return { skipped: true };
    }

    let creditsReserved = 0;

    try {
      await updateJob({
        status: "running",
        progress: 2,
        started_at: new Date().toISOString(),
        trigger_run_id: ctx.run.id,
      });
      const config = lambdaConfig();

      const { data: rawProject, error: projectError } = await supabase
        .from("projects")
        .select(
          "title, source_video_key, working_video_key, width, height, duration_s, caption_style",
        )
        .eq("id", job.project_id)
        .single();
      if (projectError) throw projectError;
      const project = projectSchema.parse(rawProject);
      if (!project.source_video_key) throw new JobError("no_video");
      if (!project.width || !project.height || !project.duration_s)
        throw new JobError("video_not_measured");
      const source = { width: project.width, height: project.height };
      if (job.options.quality === "4k" && !canExport4k(source))
        throw new JobError("quality_unavailable");

      const { data: transcript, error: transcriptError } = await supabase
        .from("transcripts")
        .select("words")
        .eq("project_id", job.project_id)
        .eq("is_original", true)
        .single();
      if (transcriptError) throw new JobError("no_transcript");
      const words = z.array(transcriptWordSchema).parse(transcript.words);

      // Only 4K costs credits (the rest is paid with the transcription).
      const cost = exportCost(job.options.quality, project.duration_s);
      if (cost > 0) {
        const { error: reserveError } = await supabase.rpc("reserve_credits", {
          p_user_id: job.user_id,
          p_job_id: jobId,
          p_amount: cost,
        });
        if (reserveError) {
          throw new JobError(
            reserveError.message.includes("insufficient_credits")
              ? "insufficient_credits"
              : "unknown",
          );
        }
        creditsReserved = cost;
      }

      // The 1080p working copy renders cheaper with the same picture; the original is read when
      // there is no copy or when it would show less detail (4K, tight crop).
      let videoSrc: string | null = null;
      if (
        project.working_video_key &&
        chooseRenderSource(job.options, source, true) === "working"
      ) {
        videoSrc = await signWorkingCopyUrl(project.working_video_key, SIGNED_URL_SECONDS).catch(
          () => null,
        );
      }
      if (!videoSrc) {
        const { data: signed, error: signError } = await supabase.storage
          .from("videos")
          .createSignedUrl(project.source_video_key, SIGNED_URL_SECONDS);
        if (signError || !signed) throw new JobError("video_unavailable");
        videoSrc = signed.signedUrl;
      }

      const size = exportSize(job.options, source);
      const { renderId, bucketName } = await renderMediaOnLambda({
        region: config.region,
        functionName: config.functionName,
        serveUrl: config.serveUrl,
        composition: EXPORT_COMPOSITION_ID,
        inputProps: {
          videoSrc,
          words,
          captionStyle: project.caption_style,
          width: size.width,
          height: size.height,
          source,
          fit: job.options.fit,
          durationS: project.duration_s,
        },
        codec: "h264",
        // only the owner gets the file, through a short-lived link
        privacy: "private",
        downloadBehavior: { type: "download", fileName: fileName(project.title) },
        // the file is removed from S3 after a week (the user downloads it before)
        deleteAfter: "7-days",
      });
      await updateJob({ progress: 5, result: { renderId, bucketName } });
      logger.info("Render started", { renderId, size });

      for (let poll = 1; poll <= MAX_POLLS; poll += 1) {
        await wait.for({ seconds: POLL_SECONDS });
        const progress = await getRenderProgress({
          renderId,
          bucketName,
          functionName: config.functionName,
          region: config.region,
        });
        if (progress.fatalErrorEncountered) {
          logger.error("Render failed", { errors: progress.errors.slice(0, 3) });
          throw new JobError("render_failed");
        }
        if (progress.done && progress.outKey) {
          await updateJob({
            status: "succeeded",
            progress: 100,
            finished_at: new Date().toISOString(),
            result: {
              renderId,
              bucketName,
              outKey: progress.outKey,
              sizeBytes: progress.outputSizeInBytes,
              width: size.width,
              height: size.height,
            },
          });
          logger.info("Render done", { renderId, cost: progress.costs.displayCost });
          return { renderId, credits: cost };
        }
        await updateJob({ progress: Math.min(99, 5 + Math.round(progress.overallProgress * 94)) });
      }
      throw new JobError("render_timeout");
    } catch (error) {
      const code = error instanceof JobError ? error.code : "unknown";
      logger.error("Render job failed", { jobId, code, error: String(error) });

      if (creditsReserved > 0) {
        const { error: refundError } = await supabase.rpc("refund_credits", { p_job_id: jobId });
        if (refundError) logger.error("Refund failed", { jobId, refundError });
      }
      await updateJob({
        status: "failed",
        error_code: code,
        finished_at: new Date().toISOString(),
      });

      return { failed: true, code, detail: String(error).slice(0, 300) };
    }
  },
});
