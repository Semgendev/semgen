import type { TranscriptSegment, TranscriptWord } from "./types";

// Words the provider is unsure about are underlined so the user can double-check them.
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

// Pause after which no word is considered "being spoken" any more.
const SILENCE_AFTER_WORD_MS = 800;

export function isLowConfidence(word: Pick<TranscriptWord, "confidence">): boolean {
  return word.confidence !== null && word.confidence < LOW_CONFIDENCE_THRESHOLD;
}

// Index of the word being spoken at `timeMs`, or -1 before the first word / during a long silence.
export function findActiveWordIndex(
  words: Pick<TranscriptWord, "start" | "end">[],
  timeMs: number,
): number {
  let low = 0;
  let high = words.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const word = words[middle];
    if (word && word.start <= timeMs) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  const word = words[found];
  if (!word || timeMs > word.end + SILENCE_AFTER_WORD_MS) return -1;
  return found;
}

export function findSegmentIndex(
  segments: Pick<TranscriptSegment, "word_start" | "word_end">[],
  wordIndex: number,
): number {
  return segments.findIndex(
    (segment) => wordIndex >= segment.word_start && wordIndex <= segment.word_end,
  );
}

// m:ss (or h:mm:ss) for display.
export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

function srtTime(ms: number): string {
  const safe = Math.max(0, Math.round(ms));
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1000);
  const millis = safe % 1000;
  const pad = (value: number, size = 2) => String(value).padStart(size, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

export function toSrt(segments: Pick<TranscriptSegment, "start" | "end" | "text">[]): string {
  return segments
    .map(
      (segment, index) =>
        `${index + 1}\n${srtTime(segment.start)} --> ${srtTime(segment.end)}\n${segment.text}\n`,
    )
    .join("\n");
}

export function toPlainText(segments: Pick<TranscriptSegment, "text">[]): string {
  return segments.map((segment) => segment.text).join("\n");
}

// Maps the job progress (0-100) to a user-facing step, matching the worker's milestones.
export type TranscriptionStep = "queued" | "checking" | "preparing" | "transcribing";

export function transcriptionStep(
  status: "queued" | "running",
  progress: number,
): TranscriptionStep {
  if (status === "queued") return "queued";
  if (progress < 15) return "checking";
  if (progress < 26) return "preparing";
  return "transcribing";
}
