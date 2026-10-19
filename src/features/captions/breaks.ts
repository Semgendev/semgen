import type { TranscriptWord } from "../transcription/types";

// Where a caption (or a line) may be cut. Professional subtitlers cut after a full stop, then after a
// comma, then before a linking word — never between "chez" and "toi", nor between an article and its
// noun (FR, EN, ES, PT).

const NBSP = " ";
const SENTENCE_END = /[.!?…。！？؟]["»”’)]*$/;
const CLAUSE_END = /[,;:—–،؛]["»”’)]*$/;
// A token that is only punctuation ("!" when the speaker said "demain !"): glued to the word before.
const CLOSING_PUNCTUATION = /^[!?:;.,…»”’)%،؛؟]+$/;
// An opening mark alone ("«"): glued to the word after.
const OPENING_PUNCTUATION = /^[«“‘(¿¡]+$/;

// Words that start a new idea: a good place to cut, just before them.
const LINKING_WORDS = new Set(
  (
    "et mais ou donc car or ni que qui quand parce puisque comme si alors pourtant sinon lorsque dont où " +
    "and but or so because that which when while if then although since " +
    "y pero o porque que cuando si e mas ou porque quando"
  ).split(" "),
);

// Words that belong to the next one: never cut just after them.
const BINDING_WORDS = new Set(
  (
    "le la les l un une des du de d au aux à chez pour par sur sous dans avec sans en vers entre contre " +
    "mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs ce cet cette ces " +
    "je j tu il elle on nous vous ils elles me m te t se s ne n y très plus si " +
    "the a an of to in on at for with from by into my your his her our their this that these those " +
    "i you he she we they not very " +
    "el los las un una unos unas del al en con sin por para mi tu su o os as um uma no na do da"
  ).split(" "),
);

function bare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, " ")
    .split(" ")
    .pop()!
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function endsSentence(text: string): boolean {
  return SENTENCE_END.test(text);
}

// How good it is to cut between `before` and `after` (higher = better, negative = to avoid).
export function breakScore(before: string, after: string | undefined): number {
  if (!after) return 10;
  if (SENTENCE_END.test(before)) return 10;
  if (CLAUSE_END.test(before)) return 6;
  // "l'" / "d'" / "qu'" stick to the next word
  if (/['’]$/.test(before)) return -10;
  if (BINDING_WORDS.has(bare(before))) return -8;
  if (LINKING_WORDS.has(bare(after))) return 4;
  return 0;
}

// Glues lonely punctuation to its word with a no-break space ("demain" + "!" → "demain !"), so it
// can never end up alone on a line or on a caption of its own.
export function gluePunctuation(words: TranscriptWord[]): TranscriptWord[] {
  const result: TranscriptWord[] = [];
  let pendingOpen: TranscriptWord | null = null;
  for (const word of words) {
    const text = word.text.trim();
    if (CLOSING_PUNCTUATION.test(text) && result.length > 0) {
      const previous = result[result.length - 1]!;
      // French typography: a no-break space before ! ? : ; and »; none before , . … )
      const space = /^[!?:;»]/.test(text) ? NBSP : "";
      result[result.length - 1] = {
        ...previous,
        text: previous.text + space + text,
        end: Math.max(previous.end, word.end),
      };
      continue;
    }
    if (OPENING_PUNCTUATION.test(text)) {
      pendingOpen = word;
      continue;
    }
    if (pendingOpen) {
      const space = pendingOpen.text.trim() === "«" ? NBSP : "";
      result.push({
        ...word,
        text: pendingOpen.text.trim() + space + text,
        start: pendingOpen.start,
      });
      pendingOpen = null;
      continue;
    }
    result.push(word);
  }
  if (pendingOpen) result.push(pendingOpen);
  return result;
}

// Best place to cut a list of words in two (index of the first word of the second part), given the
// cost of each part's length. `balance` > 0 favours parts of equal length, < 0 favours a full first
// part. `lonelyLast` avoids leaving the last word alone (e.g. "demain !" flashing on its own at the
// end of a sentence).
const LONELY_PENALTY = 4;

export function bestCut(
  texts: string[],
  options: { balance: number; minFirst?: number; lonelyLast?: boolean },
): number {
  const lengths = texts.map((text) => text.length);
  const total = lengths.reduce((sum, length) => sum + length, 0) + texts.length - 1;
  let best = texts.length;
  let bestScore = -Infinity;
  for (let cut = Math.max(1, options.minFirst ?? 1); cut < texts.length; cut++) {
    const first = lengths.slice(0, cut).reduce((sum, length) => sum + length, 0) + cut - 1;
    const second = total - first - 1;
    const score =
      breakScore(texts[cut - 1] ?? "", texts[cut]) -
      (options.balance > 0
        ? (options.balance * Math.abs(first - second)) / Math.max(1, total)
        : (-options.balance * second) / Math.max(1, total)) -
      (options.lonelyLast && cut === texts.length - 1 ? LONELY_PENALTY : 0);
    if (score > bestScore) {
      bestScore = score;
      best = cut;
    }
  }
  return best;
}
