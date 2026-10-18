import type { TranscriptionProviderName, TranscriptSegment, TranscriptWord } from "./types";

// Pricing rule from docs/COSTS.md: 1 credit per started minute, minimum 1.
export function transcriptionCost(durationSeconds: number): number {
  return Math.max(1, Math.ceil(durationSeconds / 60));
}

// Languages where ElevenLabs Scribe is clearly more accurate than AssemblyAI (official accuracy tables,
// checked 2026-10-18). Used only when the user picks the language and Scribe is configured.
export const SCRIBE_PREFERRED_LANGUAGES = new Set([
  "sw",
  "ha",
  "yo",
  "ig",
  "am",
  "zu",
  "xh",
  "wo",
  "ln",
  "so",
  "sn",
  "ny",
  "ff",
  "lg",
  "luo",
  "nso",
  "umb",
  "kea",
]);

export function chooseTranscriptionProvider(
  language: string | null,
  scribeAvailable: boolean,
): TranscriptionProviderName {
  if (scribeAvailable && language && SCRIBE_PREFERRED_LANGUAGES.has(language)) return "elevenlabs";
  return "assemblyai";
}

const SENTENCE_END = /[.!?…。！？]$/;
const MAX_WORDS_PER_SEGMENT = 14;
const MAX_PAUSE_MS = 1000;

// Groups words into readable lines: sentence end, speaker change, long pause or length limit.
export function buildSegments(words: TranscriptWord[]): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let startIndex = 0;

  words.forEach((word, index) => {
    const next = words[index + 1];
    const length = index - startIndex + 1;
    const shouldBreak =
      !next ||
      SENTENCE_END.test(word.text) ||
      next.speaker !== word.speaker ||
      next.start - word.end > MAX_PAUSE_MS ||
      length >= MAX_WORDS_PER_SEGMENT;

    if (shouldBreak) {
      const slice = words.slice(startIndex, index + 1);
      const first = slice[0];
      if (first) {
        segments.push({
          start: first.start,
          end: word.end,
          text: slice.map((item) => item.text).join(" "),
          speaker: first.speaker,
          word_start: startIndex,
          word_end: index,
        });
      }
      startIndex = index + 1;
    }
  });

  return segments;
}
