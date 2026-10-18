"use server";

import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { isValidDraft, MAX_WORDS } from "./edit";
import { languageCodeSchema, transcriptSegmentSchema, transcriptWordSchema } from "./types";

const saveSchema = z.object({
  projectId: z.uuid(),
  words: z.array(transcriptWordSchema).min(1).max(MAX_WORDS),
  segments: z.array(transcriptSegmentSchema).min(1).max(MAX_WORDS),
});

export type SaveTranscriptResult =
  { ok: true } | { ok: false; code: "invalid" | "unauthorized" | "not_found" | "unknown" };

// Users can only read transcripts (RLS), so edits go through the server, which checks ownership first.
export async function saveTranscript(
  projectId: string,
  words: unknown,
  segments: unknown,
): Promise<SaveTranscriptResult> {
  const parsed = saveSchema.safeParse({ projectId, words, segments });
  if (!parsed.success || !isValidDraft(parsed.data)) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, code: "unauthorized" };

  // Read as the user: RLS returns the row only if it belongs to them.
  const { data: owned, error: readError } = await supabase
    .from("transcripts")
    .select("id")
    .eq("project_id", parsed.data.projectId)
    .eq("is_original", true)
    .maybeSingle();
  if (readError) return { ok: false, code: "unknown" };
  if (!owned) return { ok: false, code: "not_found" };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("transcripts")
    .update({
      words: parsed.data.words,
      segments: parsed.data.segments,
      text: parsed.data.words.map((word) => word.text).join(" "),
    })
    .eq("id", owned.id)
    .eq("user_id", auth.user.id);
  return error ? { ok: false, code: "unknown" } : { ok: true };
}

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
