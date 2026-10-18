import { logger, task, wait } from "@trigger.dev/sdk";
import { z } from "zod";

import { probeMedia } from "@/features/media/probe";
import { MAX_VIDEO_SECONDS } from "@/features/projects/limits";
import {
  buildSegments,
  chooseTranscriptionProvider,
  transcriptionCost,
} from "@/features/transcription/logic";
import { createAssemblyAiProvider } from "@/features/transcription/providers/assemblyai";
import type { TranscriptionProvider } from "@/features/transcription/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const payloadSchema = z.object({ jobId: z.uuid() });

const jobSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  project_id: z.uuid(),
  status: z.string(),
  credits_reserved: z.number(),
  options: z.object({ language: z.string().nullable().optional() }).passthrough(),
});

const projectSchema = z.object({ source_video_key: z.string().nullable() });

const POLL_SECONDS = 6;
const MAX_POLLS = 300;
const SIGNED_URL_SECONDS = 60 * 60;

// Known, user-facing failure reasons. Anything else is reported as "unknown".
class JobError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function getProvider(name: "assemblyai" | "elevenlabs"): TranscriptionProvider {
  if (name === "assemblyai") {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) throw new JobError("provider_not_configured");
    return createAssemblyAiProvider(apiKey, process.env.ASSEMBLYAI_BASE_URL);
  }
  throw new JobError("provider_not_configured");
}

export const transcribeProject = task({
  id: "transcribe-project",
  maxDuration: 60 * 30,
  // Retrying could bill the provider twice: failures are handled (and refunded) explicitly instead.
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
      .select("id, user_id, project_id, status, credits_reserved, options")
      .eq("id", jobId)
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
        progress: 5,
        started_at: new Date().toISOString(),
        trigger_run_id: ctx.run.id,
      });

      const { data: rawProject, error: projectError } = await supabase
        .from("projects")
        .select("source_video_key")
        .eq("id", job.project_id)
        .single();
      if (projectError) throw projectError;
      const project = projectSchema.parse(rawProject);
      if (!project.source_video_key) throw new JobError("no_video");

      const { data: signed, error: signError } = await supabase.storage
        .from("videos")
        .createSignedUrl(project.source_video_key, SIGNED_URL_SECONDS);
      if (signError || !signed) throw new JobError("video_unavailable");

      // 1. Measure the real file on the server (the browser check can be bypassed).
      const media = await probeMedia(signed.signedUrl);
      await supabase
        .from("projects")
        .update({
          duration_s: media.durationSeconds,
          width: media.width,
          height: media.height,
          fps: media.fps,
        })
        .eq("id", job.project_id);
      if (media.durationSeconds > MAX_VIDEO_SECONDS) throw new JobError("too_long");
      if (!media.hasAudio) throw new JobError("no_audio");
      await updateJob({ progress: 15 });

      // 2. Reserve credits for the real duration, only now that we know the job can run.
      const cost = transcriptionCost(media.durationSeconds);
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
      await updateJob({ progress: 25 });

      // 3. Transcribe through the provider best suited to the requested language.
      const requestedLanguage = job.options.language ?? null;
      const provider = getProvider(
        chooseTranscriptionProvider(requestedLanguage, Boolean(process.env.ELEVENLABS_API_KEY)),
      );
      const externalId = await provider.submit({
        mediaUrl: signed.signedUrl,
        language: requestedLanguage,
      });
      logger.info("Transcription submitted", { provider: provider.name, externalId });

      let status = await provider.check(externalId);
      for (let poll = 1; status.state === "processing" && poll <= MAX_POLLS; poll += 1) {
        await updateJob({ progress: Math.min(90, 25 + poll * 3) });
        await wait.for({ seconds: POLL_SECONDS });
        status = await provider.check(externalId);
      }
      if (status.state === "processing") throw new JobError("provider_timeout");
      if (status.state === "failed") {
        logger.error("Provider failed", { reason: status.reason });
        throw new JobError("provider_failed");
      }

      const result = status.result;
      if (result.words.length === 0) throw new JobError("no_speech");

      // 4. Store the transcript (replacing a previous original one) and finish.
      await supabase
        .from("transcripts")
        .delete()
        .eq("project_id", job.project_id)
        .eq("is_original", true);
      const { error: insertError } = await supabase.from("transcripts").insert({
        project_id: job.project_id,
        user_id: job.user_id,
        job_id: jobId,
        language: result.language,
        language_confidence: result.languageConfidence,
        is_original: true,
        provider: result.provider,
        text: result.text,
        words: result.words,
        segments: buildSegments(result.words),
      });
      if (insertError) throw insertError;

      await supabase
        .from("projects")
        .update({ status: "ready", detected_language: result.language })
        .eq("id", job.project_id);
      await updateJob({
        status: "succeeded",
        progress: 100,
        finished_at: new Date().toISOString(),
      });

      return { language: result.language, words: result.words.length, credits: cost };
    } catch (error) {
      const code = error instanceof JobError ? error.code : "unknown";
      logger.error("Transcription job failed", { jobId, code, error: String(error) });

      if (creditsReserved > 0) {
        const { error: refundError } = await supabase.rpc("refund_credits", { p_job_id: jobId });
        if (refundError) logger.error("Refund failed", { jobId, refundError });
      }
      await supabase.from("projects").update({ status: "failed" }).eq("id", job.project_id);
      await updateJob({
        status: "failed",
        error_code: code,
        finished_at: new Date().toISOString(),
      });

      return { failed: true, code };
    }
  },
});
