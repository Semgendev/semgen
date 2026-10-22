import { useSyncExternalStore } from "react";
import { continueRender, delayRender, getRemotionEnvironment, staticFile } from "remotion";

import { FONT_FACES, type FontFaceData } from "./fonts-data";
import type { FontId } from "./style";

// Caption fonts (all SIL OFL 1.1, see docs/THIRD_PARTY.md), served by the app itself from
// public/fonts/captions (see scripts/host-caption-fonts.mjs): no request to a third party, and the
// browser caches them for a year. Only the weights and scripts the styles use are shipped.
// Remotion waits for the fonts before it shows or renders a frame.

// No style font has Arabic letters: every style falls back on Cairo for them (one variable file,
// 31 KB, for all the weights). It is only downloaded when a caption contains Arabic.
const ARABIC_FAMILY = "Cairo";
export const ARABIC_TEXT = /[؀-ۿݐ-ݿࡰ-ࣿﭐ-﷿ﹰ-﻿]/;
let arabicLoaded = false;

// Same for Devanagari (Hindi, Marathi, Nepali): Noto Sans Devanagari, one variable file.
const DEVANAGARI_FAMILY = "Noto Sans Devanagari";
export const DEVANAGARI_TEXT = /[ऀ-ॿ]/;
let devanagariLoaded = false;

// Faces already asked for (a face = one weight of one font in one script range).
const requestedFaces = new Set<string>();

function loadFace(
  face: FontFaceData,
  awaitIt: boolean,
  handle: ReturnType<typeof delayRender>,
): Promise<void> {
  const source = new FontFace(face.family, `url(${staticFile(`fonts/captions/${face.file}`)})`, {
    style: face.style,
    weight: face.weight,
    unicodeRange: face.unicodeRange,
    display: "block",
  });
  // registered before it is loaded, so document.fonts.check() is false (and the text not measured
  // for good) until the real letters are there
  document.fonts.add(source);
  // latin (French, English, Spanish…) is awaited; latin-ext is only registered, and fetched by the
  // browser when a text really needs it, which halves what the gallery downloads at load
  if (!awaitIt) {
    continueRender(handle);
    return Promise.resolve();
  }
  return source.load().then(
    () => continueRender(handle),
    () => continueRender(handle),
  );
}

// Asks for the faces matching these conditions, once each. Remotion waits for the awaited ones.
function requestFaces(matches: (face: FontFaceData) => boolean, awaitAll = false): void {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return;
  for (const face of FONT_FACES) {
    if (!matches(face)) continue;
    const key = `${face.id}|${face.style}|${face.weight}|${face.unicodeRange}`;
    if (requestedFaces.has(key)) continue;
    requestedFaces.add(key);
    // the export waits for every face: a letter drawn with a fallback font would be in the file for good
    const awaitIt =
      awaitAll || getRemotionEnvironment().isRendering || face.unicodeRange.startsWith("U+0000");
    void loadFace(face, awaitIt, delayRender(`Loading caption font ${face.id} ${face.weight}`));
  }
}

// CSS font-family for a look: only the weight (and slant) the look uses is loaded, the first time.
export function fontFamily(look: { font: FontId; weight: number; italic: boolean }): string {
  const style = look.italic ? "italic" : "normal";
  const exact = FONT_FACES.some(
    (face) => face.id === look.font && face.style === style && Number(face.weight) === look.weight,
  );
  requestFaces(
    (face) =>
      face.id === look.font &&
      face.style === style &&
      // no such weight in this font: take them all rather than showing a faked one
      (!exact || Number(face.weight) === look.weight),
  );
  const family = FONT_FACES.find((face) => face.id === look.font)?.family ?? look.font;
  return `"${family}", "${ARABIC_FAMILY}", "${DEVANAGARI_FAMILY}", sans-serif`;
}

// Loads the fonts of the other scripts a caption needs (Arabic, Devanagari), before its first frame is shown.
export function loadScriptFonts(text: string): void {
  if (!arabicLoaded && ARABIC_TEXT.test(text)) {
    arabicLoaded = true;
    requestFaces((face) => face.id === "cairo", true);
  }
  if (!devanagariLoaded && DEVANAGARI_TEXT.test(text)) {
    devanagariLoaded = true;
    requestFaces((face) => face.id === "noto-devanagari", true);
  }
}

// Changes each time the browser finishes loading fonts: captions laid out with a fallback font
// (a still preview that does not play) are measured and laid out again with the real one.
let fontsVersion = 0;
const fontListeners = new Set<() => void>();

function subscribeFonts(onChange: () => void): () => void {
  if (typeof document === "undefined" || !document.fonts) return () => undefined;
  if (fontListeners.size === 0) document.fonts.addEventListener("loadingdone", bumpFonts);
  fontListeners.add(onChange);
  return () => {
    fontListeners.delete(onChange);
    if (fontListeners.size === 0) document.fonts.removeEventListener("loadingdone", bumpFonts);
  };
}

function bumpFonts() {
  fontsVersion += 1;
  for (const listener of fontListeners) listener();
}

export function useFontsVersion(): number {
  return useSyncExternalStore(
    subscribeFonts,
    () => fontsVersion,
    () => 0,
  );
}

// For the font picker (outside any video): fetches the latin letters of one bold-ish face so the
// font's name can be written in the font itself. No Remotion wait: it just shows when it is there.
const previewed = new Set<FontId>();
export function loadPreviewFont(id: FontId): void {
  if (previewed.has(id) || typeof document === "undefined" || typeof FontFace === "undefined")
    return;
  previewed.add(id);
  const faces = FONT_FACES.filter(
    (face) => face.id === id && face.style === "normal" && face.unicodeRange.startsWith("U+0000"),
  );
  const face = faces.sort(
    (a, b) => Math.abs(Number(a.weight) - 700) - Math.abs(Number(b.weight) - 700),
  )[0];
  if (!face) return;
  const source = new FontFace(face.family, `url(${staticFile(`fonts/captions/${face.file}`)})`, {
    style: "normal",
    weight: face.weight,
    unicodeRange: face.unicodeRange,
    display: "swap",
  });
  source.load().then(
    (loadedFace) => document.fonts.add(loadedFace),
    () => previewed.delete(id),
  );
}

// CSS family of a font for the picker (the weight asked is the one loaded above, or the nearest).
export function previewFamily(id: FontId): string {
  const family = FONT_FACES.find((face) => face.id === id)?.family ?? id;
  return `"${family}", sans-serif`;
}
