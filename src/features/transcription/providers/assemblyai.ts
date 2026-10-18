import { z } from "zod";

import type { TranscriptionProvider, TranscriptionResult, TranscriptionStatus } from "../types";

const transcriptResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["queued", "processing", "completed", "error"]),
  error: z.string().nullish(),
  text: z.string().nullish(),
  language_code: z.string().nullish(),
  language_confidence: z.number().nullish(),
  words: z
    .array(
      z.object({
        text: z.string(),
        start: z.number(),
        end: z.number(),
        confidence: z.number().nullish(),
        speaker: z.string().nullish(),
      }),
    )
    .nullish(),
});

export type AssemblyAiTranscript = z.infer<typeof transcriptResponseSchema>;

// "en_us" → "en", "fr" → "fr": we store the base language; regional variants stay a provider detail.
function baseLanguage(code: string): string {
  return code.toLowerCase().split(/[_-]/)[0] ?? code.toLowerCase();
}

export function mapAssemblyAiTranscript(raw: unknown): TranscriptionStatus {
  const transcript = transcriptResponseSchema.parse(raw);

  if (transcript.status === "error") {
    return { state: "failed", reason: transcript.error ?? "provider_error" };
  }
  if (transcript.status !== "completed") return { state: "processing" };

  const result: TranscriptionResult = {
    provider: "assemblyai",
    language: baseLanguage(transcript.language_code ?? "en"),
    languageConfidence: transcript.language_confidence ?? null,
    text: transcript.text ?? "",
    words: (transcript.words ?? []).map((word) => ({
      text: word.text,
      start: Math.max(0, Math.round(word.start)),
      end: Math.max(0, Math.round(word.end)),
      confidence: word.confidence ?? null,
      speaker: word.speaker ?? null,
    })),
  };
  return { state: "completed", result };
}

export function createAssemblyAiProvider(
  apiKey: string,
  baseUrl = "https://api.assemblyai.com",
): TranscriptionProvider {
  const headers = { authorization: apiKey, "content-type": "application/json" };

  return {
    name: "assemblyai",

    async submit({ mediaUrl, language }) {
      const body = {
        audio_url: mediaUrl,
        // Best model first; Universal-2 covers the 99 languages the first one does not.
        speech_models: ["universal-3-5-pro", "universal-2"],
        speaker_labels: true,
        disfluencies: true,
        punctuate: true,
        format_text: true,
        ...(language ? { language_code: language } : { language_detection: true }),
      };
      const response = await fetch(`${baseUrl}/v2/transcript`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`assemblyai_submit_${response.status}`);
      return transcriptResponseSchema.parse(await response.json()).id;
    },

    async check(externalId) {
      const response = await fetch(`${baseUrl}/v2/transcript/${encodeURIComponent(externalId)}`, {
        headers,
      });
      if (!response.ok) throw new Error(`assemblyai_check_${response.status}`);
      return mapAssemblyAiTranscript(await response.json());
    },
  };
}
