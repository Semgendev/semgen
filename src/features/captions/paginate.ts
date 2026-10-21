import type { TranscriptWord } from "../transcription/types";

import { bestCut, gluePunctuation } from "./breaks";
import type { CaptionStyle } from "./style";

// Times are in milliseconds, like the transcript.
export type CaptionWord = { text: string; start: number; end: number; emphasis: boolean };
// start/end = when the caption is on screen; speechEnd = when its last word is said.
// firstWord = index, in the transcript, of the caption's first word (the transcript tab shows the same
// captions as the video).
export type CaptionPage = {
  start: number;
  end: number;
  speechEnd: number;
  firstWord: number;
  words: CaptionWord[];
};

// A moment where the whole block is on screen, entry animations done: a little after its last word
// is said, while it is still held. Used to show every word when a block is selected to be moved.
export function blockShownAtMs(page: Pick<CaptionPage, "start" | "end" | "speechEnd">): number {
  const after = Math.min(350, Math.max(0, (page.end - page.speechEnd) / 2));
  return Math.round(Math.max(page.start, page.speechEnd + after));
}

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

// A transcript word on its way to a caption: its place in the transcript and the cut made by hand
// just before it, if that cut applies to the current style.
type Kept = TranscriptWord & { index: number; hand: "break" | "join" | null };

function keptWords(words: TranscriptWord[], cutsFor: string | undefined): Kept[] {
  const kept: Kept[] = [];
  // a cut made before a hesitation moves to the next word that is shown
  let carried: Kept["hand"] = null;
  words.forEach((word, index) => {
    const hand = (cutsFor !== undefined && word.cuts?.[cutsFor]) || null;
    if (FILLER.test(word.text.trim())) {
      carried = hand ?? carried;
      return;
    }
    kept.push({ ...word, index, hand: hand ?? carried });
    carried = null;
  });
  return gluePunctuation(kept);
}

// Captions glued by hand ("join" on the first word of a caption) become one caption, whatever their
// length: the user asked for it.
function joinByHand(groups: Kept[][]): Kept[][] {
  const result: Kept[][] = [];
  groups.forEach((group) => {
    const previous = result[result.length - 1];
    if (previous && group[0]?.hand === "join") previous.push(...group);
    else result.push(group);
  });
  return result;
}

function charCount(group: TranscriptWord[]): number {
  return group.reduce((sum, item, position) => sum + item.text.length + (position ? 1 : 0), 0);
}

// A caption of a single word flashes by too fast to read: glue it to its neighbour when they are
// said in one breath ("tu vas bien." rather than "tu vas" / "bien.").
function mergeOrphans(groups: Kept[][], maxWords: number, maxChars: number): Kept[][] {
  const result: Kept[][] = [];
  const fits = (a: Kept[], b: Kept[]) => {
    const tail = a[a.length - 1];
    const head = b[0];
    return (
      !!tail &&
      !!head &&
      // a cut made by hand stays where it is
      head.hand !== "break" &&
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

// Groups transcript words into captions shown one after the other, the way the style wants them
// (see `grouping`). `cutsFor` = the style the hand-made cuts apply to (preset id); without it, the
// cuts are ignored (style cards, demos).
export function paginate(
  words: TranscriptWord[],
  style: Pick<CaptionStyle, "maxWordsPerPage" | "maxCharsPerLine" | "layout" | "grouping">,
  cutsFor?: string,
): CaptionPage[] {
  const kept = keptWords(words, cutsFor);
  const sentence = style.grouping === "sentence";
  // "line" captions may use two lines (three for a whole sentence); "stack" captions keep one short
  // line around the key word.
  const maxChars = style.maxCharsPerLine * (style.layout === "line" && !sentence ? 2 : 3);
  // a whole sentence stays on screen through a short breath; short pieces end at any pause
  const maxPause = sentence ? BRIDGE_GAP_MS : MAX_PAUSE_MS;
  const groups: Kept[][] = [];
  let current: Kept[] = [];

  kept.forEach((word, index) => {
    // cut by hand: a new caption starts at this word
    if (word.hand === "break" && current.length > 0) {
      groups.push(current);
      current = [];
    }
    current.push(word);
    // Too long: cut where the sentence allows it (after a comma, before "et"...), never between
    // "chez" and "toi"; the words after the cut start the next caption.
    while (
      current.length > 1 &&
      (current.length > style.maxWordsPerPage || charCount(current) > maxChars)
    ) {
      // the last word of a sentence would be left alone after the cut: cut a bit earlier instead
      const cut = bestCut(
        current.map((item) => item.text),
        { balance: -1.5, lonelyLast: SENTENCE_END.test(word.text) },
      );
      groups.push(current.slice(0, cut));
      current = current.slice(cut);
    }

    const next = kept[index + 1];
    const shouldBreak =
      !next ||
      next.hand === "break" ||
      SENTENCE_END.test(word.text) ||
      next.speaker !== word.speaker ||
      next.start - word.end > maxPause;
    if (shouldBreak) {
      groups.push(current);
      current = [];
    }
  });

  const merged = joinByHand(mergeOrphans(groups, style.maxWordsPerPage, maxChars));
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
      firstWord: group[0]?.index ?? 0,
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
