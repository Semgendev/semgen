"use server";

import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { languageCodeSchema } from "./types";

const inputSchema = z.object({
  projectId: z.uuid(),
  language: languageCodeSchema.nullable(),
});

export type StartTranscriptionResult =
  | { ok: true; jobId: string }
  | {
      ok: false;
      code: "invalid" | "unauthorized" | "not_ready" | "already_running" | "unknown";
    };

export async function startTranscription(
  projectId: string,
  language: string | null,
): Promise<StartTranscriptionResult> {
  const parsed = inputSchema.safeParse({ projectId, language });
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, code: "unauthorized" };

  // Runs as the user: ownership, project state and "one job at a time" are enforced in Postgres.
  const { data: jobId, error } = await supabase.rpc("request_transcription", {
    p_project_id: parsed.data.projectId,
    p_language: parsed.data.language,
  });
  if (error) {
    if (error.message.includes("job_already_running"))
      return { ok: false, code: "already_running" };
    if (error.message.includes("project_not_ready")) return { ok: false, code: "not_ready" };
    return { ok: false, code: "unknown" };
  }
  const job = z.uuid().parse(jobId);

  try {
    await tasks.trigger("transcribe-project", { jobId: job });
    return { ok: true, jobId: job };
  } catch {
    // The worker never started: release the job so the user can try again (no credits were taken).
    const admin = createSupabaseAdminClient();
    await admin
      .from("jobs")
      .update({
        status: "failed",
        error_code: "queue_unavailable",
        finished_at: new Date().toISOString(),
      })
      .eq("id", job);
    await admin.from("projects").update({ status: "uploaded" }).eq("id", parsed.data.projectId);
    return { ok: false, code: "unknown" };
  }
}
