import { Easing, interpolate } from "remotion";

import type { AnimationIn, AnimationOut, CaptionStyle } from "./style";
import type { CaptionPage, CaptionWord } from "./paginate";

// How a word looks at one instant. Pure: the same time always gives the same picture, which is what
// makes the preview and the exported video identical.
export type WordMotion = {
  opacity: number;
  translateYEm: number;
  scale: number;
  blurEm: number;
  // share of the word that is visible, from the left (typewriter) or from the bottom (mask)
  reveal: number;
};

export const RESTING: WordMotion = { opacity: 1, translateYEm: 0, scale: 1, blurEm: 0, reveal: 1 };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// `t` = time since the word started to appear, in ms.
export function motionIn(kind: AnimationIn, t: number, durationMs: number): WordMotion {
  if (kind === "none" || durationMs <= 0) return t < 0 ? { ...RESTING, opacity: 0 } : RESTING;
  if (t < 0) return { ...RESTING, opacity: 0, reveal: 0 };
  const p = interpolate(t, [0, durationMs], [0, 1], clamp);
  switch (kind) {
    case "fade":
      return { ...RESTING, opacity: Easing.out(Easing.quad)(p) };
    case "pop": {
      // grows past its size then settles: a short, punchy bounce
      const scale = interpolate(p, [0, 1], [0.55, 1], {
        ...clamp,
        easing: Easing.out(Easing.back(2.4)),
      });
      return { ...RESTING, opacity: interpolate(p, [0, 0.35], [0, 1], clamp), scale };
    }
    case "rise": {
      const eased = Easing.out(Easing.cubic)(p);
      return { ...RESTING, opacity: eased, translateYEm: (1 - eased) * 0.45 };
    }
    case "blur": {
      const eased = Easing.out(Easing.cubic)(p);
      return {
        ...RESTING,
        opacity: eased,
        blurEm: (1 - eased) * 0.25,
        scale: 1 + (1 - eased) * 0.12,
      };
    }
    case "typewriter":
      return { ...RESTING, reveal: p };
    case "mask": {
      const eased = Easing.out(Easing.exp)(p);
      return { ...RESTING, reveal: eased, translateYEm: (1 - eased) * 0.35 };
    }
  }
}

// `t` = time since the caption started to leave, in ms.
export function motionOut(kind: AnimationOut, t: number, durationMs: number): WordMotion {
  if (kind === "none" || durationMs <= 0 || t <= 0) return RESTING;
  const p = interpolate(t, [0, durationMs], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  switch (kind) {
    case "fade":
      return { ...RESTING, opacity: 1 - p };
    case "sink":
      return { ...RESTING, opacity: 1 - p, translateYEm: p * 0.3 };
    case "blur":
      return { ...RESTING, opacity: 1 - p, blurEm: p * 0.25 };
  }
}

export function combine(a: WordMotion, b: WordMotion): WordMotion {
  return {
    opacity: a.opacity * b.opacity,
    translateYEm: a.translateYEm + b.translateYEm,
    scale: a.scale * b.scale,
    blurEm: a.blurEm + b.blurEm,
    reveal: Math.min(a.reveal, b.reveal),
  };
}

// When each word of a caption starts to appear.
export function wordAppearAt(
  page: CaptionPage,
  wordIndex: number,
  style: Pick<CaptionStyle, "reveal" | "animation">,
): number {
  const word = page.words[wordIndex];
  if (!word) return page.start;
  // Synced to speech, but never later than the caption itself (no empty frame at the start).
  if (style.reveal === "word") return Math.max(page.start, word.start - style.animation.inMs * 0.3);
  return page.start + wordIndex * style.animation.staggerMs;
}

// Full motion of one word at `timeMs`.
export function wordMotionAt(
  page: CaptionPage,
  wordIndex: number,
  timeMs: number,
  style: Pick<CaptionStyle, "reveal" | "animation">,
): WordMotion {
  const appear = motionIn(
    style.animation.in,
    timeMs - wordAppearAt(page, wordIndex, style),
    style.animation.inMs,
  );
  const leaveAt = page.end - style.animation.outMs;
  const leave = motionOut(style.animation.out, timeMs - leaveAt, style.animation.outMs);
  return combine(appear, leave);
}

export function isSpoken(word: Pick<CaptionWord, "start" | "end">, timeMs: number): boolean {
  return timeMs >= word.start && timeMs < word.end;
}

export function applyCase(text: string, textCase: CaptionStyle["textCase"]): string {
  if (textCase === "upper") return text.toLocaleUpperCase();
  if (textCase === "lower") return text.toLocaleLowerCase();
  return text;
}

// Splits a caption into lines. "line": greedy fill, then balanced. "stack": words before the key
// word / the key word alone / words after it.
export function layoutLines(
  words: Pick<CaptionWord, "text" | "emphasis">[],
  style: Pick<CaptionStyle, "layout" | "maxCharsPerLine">,
): number[][] {
  const indices = words.map((_, index) => index);
  if (style.layout === "stack") {
    const key = words.findIndex((word) => word.emphasis);
    if (key < 0) return [indices];
    return [indices.slice(0, key), [key], indices.slice(key + 1)].filter((line) => line.length > 0);
  }
  const length = (line: number[]) =>
    line.reduce(
      (sum, index, position) => sum + (words[index]?.text.length ?? 0) + (position ? 1 : 0),
      0,
    );
  if (length(indices) <= style.maxCharsPerLine) return [indices];
  // two lines, cut where they are the most balanced
  let bestCut = 1;
  let bestDiff = Infinity;
  for (let cut = 1; cut < indices.length; cut++) {
    const diff = Math.abs(length(indices.slice(0, cut)) - length(indices.slice(cut)));
    if (diff < bestDiff) {
      bestDiff = diff;
      bestCut = cut;
    }
  }
  return [indices.slice(0, bestCut), indices.slice(bestCut)];
}
