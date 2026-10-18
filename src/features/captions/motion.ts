import { Easing, interpolate, spring } from "remotion";

import type { AnimationIn, AnimationOut, CaptionStyle } from "./style";
import { TEXT_LEAD_MS, type CaptionPage, type CaptionWord } from "./paginate";

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
const easeOutExpo = Easing.out(Easing.exp);

// A real spring (mass, stiffness, damping) that settles exactly at `durationMs`. Time is passed in
// ms with fps = 1000, so the curve does not depend on the frame rate of the video.
export function springAt(
  t: number,
  durationMs: number,
  config: { stiffness: number; damping: number; mass: number },
): number {
  if (t <= 0) return 0;
  if (t >= durationMs) return 1;
  return spring({ frame: t, fps: 1000, config, durationInFrames: durationMs });
}

// Opacity rises in a straight, fast line while the movement is still settling: the word is
// readable almost at once (what motion designers do).
function quickOpacity(t: number, durationMs: number): number {
  return interpolate(t, [0, Math.min(160, durationMs * 0.5)], [0, 1], clamp);
}

// `t` = time since the word started to appear, in ms.
export function motionIn(kind: AnimationIn, t: number, durationMs: number): WordMotion {
  if (kind === "none" || durationMs <= 0) return t < 0 ? { ...RESTING, opacity: 0 } : RESTING;
  if (t < 0) return { ...RESTING, opacity: 0, reveal: 0 };
  const p = interpolate(t, [0, durationMs], [0, 1], clamp);
  switch (kind) {
    case "fade":
      return { ...RESTING, opacity: Easing.out(Easing.quad)(p) };
    case "pop": {
      // grows past its size (~8 %) then settles, on a spring
      const s = springAt(t, durationMs, { stiffness: 220, damping: 14, mass: 0.6 });
      return { ...RESTING, opacity: quickOpacity(t, durationMs), scale: 0.6 + 0.4 * s };
    }
    case "rise": {
      const eased = easeOutExpo(p);
      return { ...RESTING, opacity: quickOpacity(t, durationMs), translateYEm: (1 - eased) * 0.45 };
    }
    case "blur": {
      const eased = easeOutExpo(p);
      return {
        ...RESTING,
        opacity: quickOpacity(t, durationMs),
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
  // the movement accelerates away, the opacity drops a bit earlier: a clean, quick exit
  const p = interpolate(t, [0, durationMs], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const opacity = 1 - interpolate(t, [0, durationMs * 0.85], [0, 1], clamp);
  switch (kind) {
    case "fade":
      return { ...RESTING, opacity };
    case "sink":
      return { ...RESTING, opacity, translateYEm: p * 0.3 };
    case "blur":
      return { ...RESTING, opacity, blurEm: p * 0.2, translateYEm: -p * 0.12 };
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
  // Slightly ahead of the voice, so the word is readable when it is heard.
  if (style.reveal === "word") return Math.max(page.start, word.start - TEXT_LEAD_MS);
  return page.start + wordIndex * style.animation.staggerMs;
}

// The caption leaves once its time is over, and its exit overlaps the entrance of the next one: the
// two cross over smoothly instead of the text being swapped from one frame to the next.
export function exitMs(style: Pick<CaptionStyle, "animation">): number {
  return style.animation.out === "none" ? 0 : style.animation.outMs;
}

function leaveWindow(page: CaptionPage, outMs: number): { at: number; duration: number } {
  return { at: page.end, duration: outMs };
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
  const leave = leaveWindow(page, exitMs(style));
  return combine(appear, motionOut(style.animation.out, timeMs - leave.at, leave.duration));
}

// How "on" the highlight of a word is (0 → 1). It lights up in a few frames and fades out a bit
// more slowly, so it glides from one word to the next instead of blinking.
const ACTIVE_RAMP_IN_MS = 90;
const ACTIVE_RAMP_OUT_MS = 140;

export function activeAmount(page: CaptionPage, wordIndex: number, timeMs: number): number {
  const window = activeWindow(page, wordIndex);
  const on = interpolate(timeMs, [window.start, window.start + ACTIVE_RAMP_IN_MS], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const off = interpolate(timeMs, [window.end, window.end + ACTIVE_RAMP_OUT_MS], [1, 0], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  return on * off;
}

// The highlight switches a hair before the voice (the eye is slower than the ear) and stays on
// through the tiny silences between words, so it never blinks off mid-sentence.
export const ACTIVE_LEAD_MS = 40;
const ACTIVE_BRIDGE_MS = 400;

export function activeWindow(page: CaptionPage, wordIndex: number): { start: number; end: number } {
  const word = page.words[wordIndex];
  if (!word) return { start: Infinity, end: -Infinity };
  const next = page.words[wordIndex + 1];
  const end =
    next && next.start - word.end <= ACTIVE_BRIDGE_MS ? next.start - ACTIVE_LEAD_MS : word.end;
  return { start: word.start - ACTIVE_LEAD_MS, end };
}

export function isActiveWord(page: CaptionPage, wordIndex: number, timeMs: number): boolean {
  const window = activeWindow(page, wordIndex);
  return timeMs >= window.start && timeMs < window.end;
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
