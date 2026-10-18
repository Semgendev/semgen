import type { TranscriptSegment, TranscriptWord } from "./types";
import { findSegmentIndex } from "./view";

export type TranscriptDraft = { words: TranscriptWord[]; segments: TranscriptSegment[] };

export const MAX_WORDS = 30_000;
// Typed words are cut to MAX_WORD_LENGTH; validation allows a little more for provider output.
export const MAX_WORD_LENGTH = 80;
const MAX_STORED_WORD_LENGTH = 120;

function normalizeToken(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Segment text, timing and speaker are always derived from the words so they never drift apart.
export function rebuildSegments(
  words: TranscriptWord[],
  segments: TranscriptSegment[],
): TranscriptSegment[] {
  return segments.flatMap((segment) => {
    const slice = words.slice(segment.word_start, segment.word_end + 1);
    const first = slice[0];
    const last = slice[slice.length - 1];
    if (!first || !last) return [];
    return [
      {
        start: first.start,
        end: last.end,
        text: slice.map((word) => word.text).join(" "),
        speaker: first.speaker,
        word_start: segment.word_start,
        word_end: segment.word_end,
      },
    ];
  });
}

function withSegments(words: TranscriptWord[], segments: TranscriptSegment[]): TranscriptDraft {
  return { words, segments: rebuildSegments(words, segments) };
}

// Corrects one word. The timing is kept; typing several words splits the time by letter count.
// Returns null when nothing changes (empty text, same text, or too many words).
export function editWord(
  draft: TranscriptDraft,
  index: number,
  rawText: string,
): TranscriptDraft | null {
  const word = draft.words[index];
  if (!word) return null;
  const parts = normalizeToken(rawText)
    .split(" ")
    .filter(Boolean)
    .map((part) => part.slice(0, MAX_WORD_LENGTH));
  const [only] = parts;
  if (!only) return null;

  if (parts.length === 1) {
    if (only === word.text) return null;
    const words = draft.words.map((item, position) =>
      position === index ? { ...item, text: only } : item,
    );
    return withSegments(words, draft.segments);
  }

  const extra = parts.length - 1;
  if (draft.words.length + extra > MAX_WORDS) return null;
  const totalChars = parts.reduce((sum, part) => sum + part.length, 0);
  const span = word.end - word.start;
  let consumed = 0;
  const replacements = parts.map((text, position) => {
    const start = word.start + Math.round((span * consumed) / totalChars);
    consumed += text.length;
    const end =
      position === parts.length - 1
        ? word.end
        : word.start + Math.round((span * consumed) / totalChars);
    return { ...word, text, start, end };
  });
  const words = [...draft.words.slice(0, index), ...replacements, ...draft.words.slice(index + 1)];
  const segments = draft.segments.map((segment) => ({
    ...segment,
    word_start: segment.word_start > index ? segment.word_start + extra : segment.word_start,
    word_end: segment.word_end >= index ? segment.word_end + extra : segment.word_end,
  }));
  return withSegments(words, segments);
}

// Removes a word (a mistake, a stutter). A line left empty disappears; the last word stays.
export function deleteWord(draft: TranscriptDraft, index: number): TranscriptDraft | null {
  if (!draft.words[index] || draft.words.length <= 1) return null;
  const words = draft.words.filter((_, position) => position !== index);
  const segments = draft.segments.flatMap((segment) => {
    if (segment.word_end < index) return [segment];
    if (segment.word_start > index) {
      return [{ ...segment, word_start: segment.word_start - 1, word_end: segment.word_end - 1 }];
    }
    const word_end = segment.word_end - 1;
    return word_end < segment.word_start ? [] : [{ ...segment, word_end }];
  });
  return withSegments(words, segments);
}

export function mergeWithPrevious(
  draft: TranscriptDraft,
  segmentIndex: number,
): TranscriptDraft | null {
  const previous = draft.segments[segmentIndex - 1];
  const current = draft.segments[segmentIndex];
  if (!previous || !current) return null;
  const merged = { ...previous, word_end: current.word_end };
  const segments = [
    ...draft.segments.slice(0, segmentIndex - 1),
    merged,
    ...draft.segments.slice(segmentIndex + 1),
  ];
  return withSegments(draft.words, segments);
}

// Starts a new line at the given word (it becomes the first word of the new line).
export function splitSegmentAt(draft: TranscriptDraft, wordIndex: number): TranscriptDraft | null {
  const segmentIndex = findSegmentIndex(draft.segments, wordIndex);
  const segment = draft.segments[segmentIndex];
  if (!segment || wordIndex <= segment.word_start) return null;
  const segments = [
    ...draft.segments.slice(0, segmentIndex),
    { ...segment, word_end: wordIndex - 1 },
    { ...segment, word_start: wordIndex },
    ...draft.segments.slice(segmentIndex + 1),
  ];
  return withSegments(draft.words, segments);
}

function searchPattern(find: string, caseSensitive: boolean): RegExp {
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, caseSensitive ? "gu" : "giu");
}

// Counts matches inside single words (a search never spans two words).
export function countMatches(
  words: Pick<TranscriptWord, "text">[],
  find: string,
  caseSensitive: boolean,
): number {
  if (!find) return 0;
  const pattern = searchPattern(find, caseSensitive);
  return words.reduce((total, word) => total + (word.text.match(pattern)?.length ?? 0), 0);
}

// Indexes of the words containing the search text (used to highlight and jump between results).
export function findMatchIndices(
  words: Pick<TranscriptWord, "text">[],
  find: string,
  caseSensitive: boolean,
): number[] {
  if (!find) return [];
  const needle = caseSensitive ? find : find.toLowerCase();
  const indices: number[] = [];
  words.forEach((word, index) => {
    const text = caseSensitive ? word.text : word.text.toLowerCase();
    if (text.includes(needle)) indices.push(index);
  });
  return indices;
}

// Replaces inside one word; null when it does not match or the result would be empty / multi-word.
function replaceInWord(
  word: TranscriptWord,
  pattern: RegExp,
  replacement: string,
): { word: TranscriptWord; matches: number } | null {
  const matches = word.text.match(pattern)?.length ?? 0;
  if (matches === 0) return null;
  const next = word.text.replace(pattern, () => replacement);
  if (!next.trim() || /\s/.test(next) || next === word.text) return null;
  return { word: { ...word, text: next.slice(0, MAX_WORD_LENGTH) }, matches };
}

export function replaceAll(
  draft: TranscriptDraft,
  find: string,
  replacement: string,
  caseSensitive: boolean,
): { draft: TranscriptDraft; count: number } {
  if (!find) return { draft, count: 0 };
  const pattern = searchPattern(find, caseSensitive);
  let count = 0;
  const words = draft.words.map((word) => {
    const result = replaceInWord(word, pattern, replacement);
    if (!result) return word;
    count += result.matches;
    return result.word;
  });
  return count === 0 ? { draft, count: 0 } : { draft: withSegments(words, draft.segments), count };
}

// Replaces in a single word only (the "Replace" button, one result at a time).
export function replaceAt(
  draft: TranscriptDraft,
  index: number,
  find: string,
  replacement: string,
  caseSensitive: boolean,
): TranscriptDraft | null {
  const word = draft.words[index];
  if (!word || !find) return null;
  const result = replaceInWord(word, searchPattern(find, caseSensitive), replacement);
  if (!result) return null;
  const words = draft.words.map((item, position) => (position === index ? result.word : item));
  return withSegments(words, draft.segments);
}

// Final check before saving: lines must cover every word once, in order.
export function isValidDraft(draft: TranscriptDraft): boolean {
  const { words, segments } = draft;
  if (words.length === 0 || words.length > MAX_WORDS || segments.length === 0) return false;
  if (words.some((word) => word.end < word.start || word.text.length > MAX_STORED_WORD_LENGTH))
    return false;
  if (words.some((word) => word.text.trim() === "")) return false;
  let expectedStart = 0;
  for (const segment of segments) {
    if (segment.word_start !== expectedStart || segment.word_end < segment.word_start) return false;
    expectedStart = segment.word_end + 1;
  }
  return expectedStart === words.length;
}
