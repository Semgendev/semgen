import { paginate, type CaptionPage } from "../captions/paginate";
import type { CaptionStyle } from "../captions/style";
import type { TranscriptDraft } from "./edit";
import type { CutKind, TranscriptSegment, TranscriptWord } from "./types";

// The transcript tab shows the captions of the chosen style, one per line. Cuts made by hand are kept
// on the words (saved with them), one per style: each style only uses its own.

export type CaptionLine = Pick<TranscriptSegment, "word_start" | "word_end">;
export type GroupingStyle = Pick<
  CaptionStyle,
  "maxWordsPerPage" | "maxCharsPerLine" | "layout" | "grouping"
>;

// Lines of the transcript tab: every word once, in order. Hesitations (not shown on the video) stay
// at the end of the line before them, so they can still be corrected or deleted.
export function captionLines(
  pages: Pick<CaptionPage, "firstWord">[],
  wordCount: number,
): CaptionLine[] {
  if (wordCount === 0) return [];
  // words before the first caption (a hesitation, a lonely "!") belong to the first line
  const starts = [0];
  for (const page of pages.slice(1)) {
    const last = starts[starts.length - 1] ?? 0;
    if (page.firstWord > last && page.firstWord < wordCount) starts.push(page.firstWord);
  }
  return starts.map((word_start, index) => ({
    word_start,
    word_end: (starts[index + 1] ?? wordCount) - 1,
  }));
}

// Sets (or removes, with null) this style's cut before a word; the other styles keep theirs.
export function setCut(
  word: TranscriptWord,
  presetId: string,
  kind: CutKind | null,
): TranscriptWord {
  const cuts = { ...word.cuts };
  if (kind) cuts[presetId] = kind;
  else delete cuts[presetId];
  const next: TranscriptWord = { ...word, cuts };
  if (Object.keys(cuts).length === 0) delete next.cuts;
  return next;
}

function withCut(
  draft: TranscriptDraft,
  index: number,
  presetId: string,
  kind: CutKind | null,
): TranscriptDraft {
  const words = draft.words.map((word, position) =>
    position === index ? setCut(word, presetId, kind) : word,
  );
  return { words, segments: draft.segments };
}

// "New line": a caption starts at this word, in this style.
export function breakBefore(
  draft: TranscriptDraft,
  index: number,
  presetId: string,
): TranscriptDraft | null {
  if (index <= 0 || !draft.words[index]) return null;
  return withCut(draft, index, presetId, "break");
}

function startsCaption(
  words: TranscriptWord[],
  index: number,
  style: GroupingStyle,
  presetId: string,
) {
  return captionLines(paginate(words, style, presetId), words.length).some(
    (line) => line.word_start === index,
  );
}

// "Merge": the caption starting at this word is glued to the one before it. A cut made by hand there
// is simply removed; if the style still cuts at this word, the two captions are glued by hand.
export function joinAt(
  draft: TranscriptDraft,
  index: number,
  style: GroupingStyle,
  presetId: string,
): TranscriptDraft | null {
  const word = draft.words[index];
  if (index <= 0 || !word) return null;
  if (word.cuts?.[presetId] === "break") {
    const removed = withCut(draft, index, presetId, null);
    if (!startsCaption(removed.words, index, style, presetId)) return removed;
  }
  return withCut(draft, index, presetId, "join");
}

// The cut another style made before this word, when this style has none there ("break" wins over
// "join" when two other styles disagree).
function cutFromOtherStyles(word: TranscriptWord, presetId: string): CutKind | null {
  if (!word.cuts || word.cuts[presetId]) return null;
  const others = Object.entries(word.cuts)
    .filter(([style]) => style !== presetId)
    .map(([, kind]) => kind);
  if (others.includes("break")) return "break";
  return others.length > 0 ? "join" : null;
}

// Cuts made by hand in other styles that this style does not have.
export function hiddenCutCount(words: TranscriptWord[], presetId: string): number {
  return words.reduce((count, word) => count + (cutFromOtherStyles(word, presetId) ? 1 : 0), 0);
}

// "Back to my previous cuts": copies the cuts of the other styles into this one (the other styles
// keep theirs).
export function restoreCuts(draft: TranscriptDraft, presetId: string): TranscriptDraft | null {
  if (hiddenCutCount(draft.words, presetId) === 0) return null;
  const words = draft.words.map((word) => {
    const kind = cutFromOtherStyles(word, presetId);
    return kind ? setCut(word, presetId, kind) : word;
  });
  return { words, segments: draft.segments };
}

// SRT / TXT files: exactly the captions shown on the video (hesitations left out).
export function captionsForExport(
  pages: Pick<CaptionPage, "start" | "end" | "words">[],
): Pick<TranscriptSegment, "start" | "end" | "text">[] {
  return pages.map((page) => ({
    start: page.start,
    end: page.end,
    text: page.words.map((word) => word.text).join(" "),
  }));
}
