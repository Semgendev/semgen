import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { transcriptSegmentSchema, transcriptWordSchema } from "./types";

export const transcriptSchema = z.object({
  id: z.uuid(),
  language: z.string(),
  language_confidence: z.number().nullable(),
  provider: z.string(),
  words: z.array(transcriptWordSchema),
  segments: z.array(transcriptSegmentSchema),
});

export type Transcript = z.infer<typeof transcriptSchema>;

export const transcriptionJobSchema = z.object({
  id: z.uuid(),
  status: z.enum(["queued", "running", "succeeded", "failed", "cancelled"]),
  progress: z.number().int(),
  error_code: z.string().nullable(),
});

export type TranscriptionJob = z.infer<typeof transcriptionJobSchema>;

export const JOB_COLUMNS = "id, status, progress, error_code";

export async function getTranscript(
  supabase: SupabaseClient,
  projectId: string,
): Promise<Transcript | null> {
  const { data, error } = await supabase
    .from("transcripts")
    .select("id, language, language_confidence, provider, words, segments")
    .eq("project_id", projectId)
    .eq("is_original", true)
    .maybeSingle();
  if (error) throw error;
  return data ? transcriptSchema.parse(data) : null;
}

export async function getLatestTranscriptionJob(
  supabase: SupabaseClient,
  projectId: string,
): Promise<TranscriptionJob | null> {
  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_COLUMNS)
    .eq("project_id", projectId)
    .eq("type", "transcribe")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? transcriptionJobSchema.parse(data) : null;
}
