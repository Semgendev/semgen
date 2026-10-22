"use server";

import { presignUrl, type AwsRegion } from "@remotion/lambda/client";
import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { exportOptionsSchema } from "./options";

const startSchema = z.object({ projectId: z.uuid(), options: exportOptionsSchema });

export type StartExportResult =
  | { ok: true; jobId: string }
  | {
      ok: false;
      code: "invalid" | "unauthorized" | "no_transcript" | "already_running" | "limit" | "unknown";
    };

export async function startExport(projectId: string, options: unknown): Promise<StartExportResult> {
  const parsed = startSchema.safeParse({ projectId, options });
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, code: "unauthorized" };

  // Runs as the user: ownership, the transcript, the daily cap and "one export at a time" are
  // enforced in Postgres.
  const { data: jobId, error } = await supabase.rpc("request_render", {
    p_project_id: parsed.data.projectId,
    p_options: parsed.data.options,
  });
  if (error) {
    if (error.message.includes("job_already_running"))
      return { ok: false, code: "already_running" };
    if (error.message.includes("no_transcript")) return { ok: false, code: "no_transcript" };
    if (error.message.includes("render_limit")) return { ok: false, code: "limit" };
    return { ok: false, code: "unknown" };
  }
  const job = z.uuid().parse(jobId);

  try {
    await tasks.trigger("render-video", { jobId: job });
    return { ok: true, jobId: job };
  } catch {
    // The worker never started: release the job so the user can try again (no credits were taken).
    await createSupabaseAdminClient()
      .from("jobs")
      .update({
        status: "failed",
        error_code: "queue_unavailable",
        finished_at: new Date().toISOString(),
      })
      .eq("id", job);
    return { ok: false, code: "unknown" };
  }
}

const resultSchema = z.object({ bucketName: z.string().min(1), outKey: z.string().min(1) });

const DOWNLOAD_LINK_SECONDS = 60 * 60;

export type ExportDownloadResult =
  | { ok: true; url: string }
  | { ok: false; code: "invalid" | "unauthorized" | "not_found" | "expired" | "unknown" };

// A short-lived link to the finished file, for its owner only.
export async function getExportDownloadUrl(jobId: string): Promise<ExportDownloadResult> {
  const id = z.uuid().safeParse(jobId);
  if (!id.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, code: "unauthorized" };

  // Read as the user: RLS returns the job only if it belongs to them.
  const { data: job, error } = await supabase
    .from("jobs")
    .select("status, result")
    .eq("id", id.data)
    .eq("type", "render")
    .maybeSingle();
  if (error) return { ok: false, code: "unknown" };
  if (!job || job.status !== "succeeded") return { ok: false, code: "not_found" };
  const result = resultSchema.safeParse(job.result);
  if (!result.success) return { ok: false, code: "not_found" };

  const region = process.env.REMOTION_AWS_REGION;
  if (!region) return { ok: false, code: "unknown" };
  try {
    const url = await presignUrl({
      region: region as AwsRegion,
      bucketName: result.data.bucketName,
      objectKey: result.data.outKey,
      expiresInSeconds: DOWNLOAD_LINK_SECONDS,
      checkIfObjectExists: true,
    });
    // removed from S3 after a week
    return url ? { ok: true, url } : { ok: false, code: "expired" };
  } catch {
    return { ok: false, code: "unknown" };
  }
}
