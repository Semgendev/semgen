import type { TranscriptWord } from "../transcription/types";

import type { CaptionStyle } from "./style";

// Times are in milliseconds, like the transcript.
export type CaptionWord = { text: string; start: number; end: number; emphasis: boolean };
// start/end = when the caption is on screen; speechEnd = when its last word is said.
export type CaptionPage = { start: number; end: number; speechEnd: number; words: CaptionWord[] };

// Timing rules of professional subtitles:
// - the text shows up slightly before the voice, so it is readable when the word is heard;
export const TEXT_LEAD_MS = 120;
// - it stays a little after its last word...
export const HOLD_MS = 800;
// - ...and bridges short silences up to the next caption, so the screen never flickers empty;
export const BRIDGE_GAP_MS = 1500;
// - and no caption is shorter than this, so it can always be read.
export const MIN_PAGE_MS = 900;
const MAX_PAUSE_MS = 700;
const SENTENCE_END = /[.!?…。！？]$/;
// Hesitations stay in the transcript (useful for auto-cut later) but never in the captions.
const FILLER = /^(?:euh+|heu+|hum+|hmm+|uh+|um+|erm+|ehm+)[.,!?…]*$/i;

// Short words that are never the key word of a caption (FR, EN, ES, PT).
const STOP_WORDS = new Set(
  (
    "le la les l un une des du de d au aux et ou mais donc or ni car que qu qui quoi dont où ce cet cette ces " +
    "je j tu il elle on nous vous ils elles me m te t se s lui leur y en ne n pas plus très bien ça c est sont " +
    "a ai as avons avez ont été être avoir sur sous dans par pour avec sans chez vers mon ma mes ton ta tes son sa ses " +
    "notre nos votre vos the a an and or but so of to in on at for with from by is are was were be been it its " +
    "this that these those i you he she we they me my your his her our their do does did not no yes just very " +
    "el los las lo y o pero por para con sin es son un una unos unas mi tu su o os as um uma com sem não"
  ).split(" "),
);

function letters(text: string): string {
  return text.replace(/[^\p{L}\p{N}]/gu, "");
}

function isStopWord(text: string): boolean {
  const clean = letters(text).toLowerCase();
  return clean.length === 0 || STOP_WORDS.has(clean);
}

// The key word of a caption: the longest meaningful word, with a bonus for numbers and exclamations.
export function pickEmphasis(words: Pick<CaptionWord, "text">[]): number {
  let best = -1;
  let bestScore = -Infinity;
  words.forEach((word, index) => {
    const clean = letters(word.text);
    if (!clean) return;
    let score = clean.length;
    if (isStopWord(word.text)) score -= 100;
    if (/\p{N}/u.test(clean)) score += 4;
    if (/!$/.test(word.text)) score += 3;
    // ties: the later word wins (the end of a phrase usually carries the meaning)
    if (score >= bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}

function charCount(group: TranscriptWord[]): number {
  return group.reduce((sum, item, position) => sum + item.text.length + (position ? 1 : 0), 0);
}

// A caption of a single word flashes by too fast to read: glue it to its neighbour when they are
// said in one breath ("tu vas bien." rather than "tu vas" / "bien.").
function mergeOrphans(
  groups: TranscriptWord[][],
  maxWords: number,
  maxChars: number,
): TranscriptWord[][] {
  const result: TranscriptWord[][] = [];
  const fits = (a: TranscriptWord[], b: TranscriptWord[]) => {
    const tail = a[a.length - 1];
    const head = b[0];
    return (
      !!tail &&
      !!head &&
      tail.speaker === head.speaker &&
      head.start - tail.end <= MAX_PAUSE_MS &&
      a.length + b.length <= maxWords + 1 &&
      charCount(a) + 1 + charCount(b) <= maxChars
    );
  };
  groups.forEach((group, index) => {
    const previous = result[result.length - 1];
    const next = groups[index + 1];
    const orphan = group.length === 1;
    const previousEndsSentence = SENTENCE_END.test(previous?.[previous.length - 1]?.text ?? ".");
    if (orphan && previous && !previousEndsSentence && fits(previous, group)) {
      previous.push(...group);
    } else if (orphan && next && !SENTENCE_END.test(group[0]?.text ?? "") && fits(group, next)) {
      next.unshift(...group);
    } else {
      result.push([...group]);
    }
  });
  return result;
}

// Groups transcript words into captions shown one after the other.
export function paginate(
  words: TranscriptWord[],
  style: Pick<CaptionStyle, "maxWordsPerPage" | "maxCharsPerLine" | "layout">,
): CaptionPage[] {
  const kept = words.filter((word) => !FILLER.test(word.text.trim()));
  // "line" captions may use two lines; "stack" captions keep one short line around the key word.
  const maxChars = style.layout === "line" ? style.maxCharsPerLine * 2 : style.maxCharsPerLine * 3;
  const groups: TranscriptWord[][] = [];
  let current: TranscriptWord[] = [];
  let chars = 0;

  kept.forEach((word, index) => {
    const nextChars = chars + (current.length > 0 ? 1 : 0) + word.text.length;
    if (current.length > 0 && nextChars > maxChars) {
      groups.push(current);
      current = [];
    }
    current.push(word);
    chars = current.reduce((sum, item, position) => sum + item.text.length + (position ? 1 : 0), 0);

    const next = kept[index + 1];
    const shouldBreak =
      !next ||
      current.length >= style.maxWordsPerPage ||
      SENTENCE_END.test(word.text) ||
      next.speaker !== word.speaker ||
      next.start - word.end > MAX_PAUSE_MS;
    if (shouldBreak) {
      groups.push(current);
      current = [];
      chars = 0;
    }
  });

  const merged = mergeOrphans(groups, style.maxWordsPerPage, maxChars);
  const starts: number[] = [];
  merged.forEach((group, index) => {
    const lead = (group[0]?.start ?? 0) - TEXT_LEAD_MS;
    // never before the previous caption has finished its last word
    const previous = merged[index - 1];
    starts.push(Math.max(0, lead, previous?.[previous.length - 1]?.end ?? 0));
  });

  return merged.map((group, index) => {
    const emphasis = pickEmphasis(group);
    const start = starts[index] ?? 0;
    const lastEnd = group[group.length - 1]?.end ?? 0;
    const nextStart = starts[index + 1] ?? Infinity;
    const wanted =
      nextStart - lastEnd <= BRIDGE_GAP_MS
        ? nextStart
        : Math.max(lastEnd + HOLD_MS, start + MIN_PAGE_MS);
    return {
      start,
      end: Math.max(start + 1, Math.min(wanted, nextStart)),
      speechEnd: lastEnd,
      words: group.map((word, position) => ({
        text: word.text,
        start: word.start,
        end: word.end,
        emphasis: position === emphasis,
      })),
    };
  });
}

// Captions on screen at a given time: the current one, plus the previous one while its exit is still
// playing (`exitMs` after its end). At most two, oldest first.
export function visiblePageIndices(
  pages: Pick<CaptionPage, "start" | "end">[],
  timeMs: number,
  exitMs: number,
): number[] {
  const last = lastStartedIndex(pages, timeMs);
  const visible: number[] = [];
  for (const index of [last - 1, last]) {
    const page = pages[index];
    if (page && timeMs >= page.start && timeMs < page.end + exitMs) visible.push(index);
  }
  return visible;
}

function lastStartedIndex(pages: Pick<CaptionPage, "start">[], timeMs: number): number {
  let low = 0;
  let high = pages.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const page = pages[middle];
    if (page && page.start <= timeMs) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

// The caption on screen at a given time, or -1 (binary search: called on every frame).
export function findPageIndex(pages: Pick<CaptionPage, "start" | "end">[], timeMs: number): number {
  const found = lastStartedIndex(pages, timeMs);
  const page = pages[found];
  return page && timeMs < page.end ? found : -1;
}
