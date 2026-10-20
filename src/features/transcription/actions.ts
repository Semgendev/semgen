"use server";

import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserId } from "@/lib/supabase/session";

import { isValidDraft, MAX_WORDS } from "./edit";
import {
  languageCodeSchema,
  transcriptSegmentSchema,
  transcriptWordSchema,
  type TranscriptSegment,
  type TranscriptWord,
} from "./types";

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
  const userId = await getSessionUserId(supabase);
  if (!userId) return { ok: false, code: "unauthorized" };

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
  const text = parsed.data.words.map((word) => word.text).join(" ");

  // The first save keeps the provider's text aside; later saves never touch that copy. The
  // "is_edited" filter makes two saves racing on the first edit safe (the loser reads again).
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: row, error: rowError } = await admin
      .from("transcripts")
      .select("words, segments, is_edited")
      .eq("id", owned.id)
      .eq("user_id", userId)
      .single();
    if (rowError) return { ok: false, code: "unknown" };

    const { data: updated, error } = await admin
      .from("transcripts")
      .update({
        words: parsed.data.words,
        segments: parsed.data.segments,
        text,
        ...(row.is_edited
          ? {}
          : { original_words: row.words, original_segments: row.segments, is_edited: true }),
      })
      .eq("id", owned.id)
      .eq("user_id", userId)
      .eq("is_edited", row.is_edited)
      .select("id");
    if (error) return { ok: false, code: "unknown" };
    if (updated.length > 0) return { ok: true };
  }
  return { ok: false, code: "unknown" };
}

export type RevertTranscriptResult =
  | { ok: true; words: TranscriptWord[]; segments: TranscriptSegment[] }
  | { ok: false; code: "invalid" | "unauthorized" | "not_found" | "nothing_to_revert" | "unknown" };

// Puts the provider's original text back (the user's corrections are dropped, after a confirmation in the UI).
export async function revertTranscript(projectId: string): Promise<RevertTranscriptResult> {
  const parsedId = z.uuid().safeParse(projectId);
  if (!parsedId.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseServerClient();
  const userId = await getSessionUserId(supabase);
  if (!userId) return { ok: false, code: "unauthorized" };

  const { data: owned, error: readError } = await supabase
    .from("transcripts")
    .select("id")
    .eq("project_id", parsedId.data)
    .eq("is_original", true)
    .maybeSingle();
  if (readError) return { ok: false, code: "unknown" };
  if (!owned) return { ok: false, code: "not_found" };

  const admin = createSupabaseAdminClient();
  const { data: row, error: rowError } = await admin
    .from("transcripts")
    .select("original_words, original_segments, is_edited")
    .eq("id", owned.id)
    .eq("user_id", userId)
    .single();
  if (rowError) return { ok: false, code: "unknown" };
  if (!row.is_edited) return { ok: false, code: "nothing_to_revert" };

  const original = z
    .object({
      words: z.array(transcriptWordSchema).min(1),
      segments: z.array(transcriptSegmentSchema).min(1),
    })
    .safeParse({ words: row.original_words, segments: row.original_segments });
  if (!original.success) return { ok: false, code: "unknown" };

  const { error } = await admin
    .from("transcripts")
    .update({
      words: original.data.words,
      segments: original.data.segments,
      text: original.data.words.map((word) => word.text).join(" "),
      original_words: null,
      original_segments: null,
      is_edited: false,
    })
    .eq("id", owned.id)
    .eq("user_id", userId);
  if (error) return { ok: false, code: "unknown" };
  return { ok: true, words: original.data.words, segments: original.data.segments };
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
