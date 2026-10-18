import { z } from "zod";

export const languageCodeSchema = z.string().regex(/^[a-z]{2,3}(_[a-z]{2})?$/);

// Times are in milliseconds for every provider.
export const transcriptWordSchema = z.object({
  text: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1).nullable(),
  speaker: z.string().nullable(),
});

export type TranscriptWord = z.infer<typeof transcriptWordSchema>;

export const transcriptSegmentSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  text: z.string(),
  speaker: z.string().nullable(),
  word_start: z.number().int().nonnegative(),
  word_end: z.number().int().nonnegative(),
});

export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>;

export type TranscriptionProviderName = "assemblyai" | "elevenlabs";

export type TranscriptionResult = {
  provider: TranscriptionProviderName;
  language: string;
  languageConfidence: number | null;
  text: string;
  words: TranscriptWord[];
};

export type TranscriptionRequest = {
  mediaUrl: string;
  // null = automatic language detection
  language: string | null;
};

export type TranscriptionStatus =
  | { state: "processing" }
  | { state: "completed"; result: TranscriptionResult }
  | { state: "failed"; reason: string };

// Every provider works in two steps so the worker can wait between polls without paying for idle time.
export interface TranscriptionProvider {
  name: TranscriptionProviderName;
  submit(request: TranscriptionRequest): Promise<string>;
  check(externalId: string): Promise<TranscriptionStatus>;
}
