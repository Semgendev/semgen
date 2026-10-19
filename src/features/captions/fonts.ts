import { useSyncExternalStore } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

import { FONT_FACES } from "./fonts-data";
import type { FontId } from "./style";

// Caption fonts (all SIL OFL 1.1, see docs/THIRD_PARTY.md), served by the app itself from
// public/fonts/captions (see scripts/host-caption-fonts.mjs): no request to a third party, and the
// browser caches them for a year. Only the weights and scripts the styles use are shipped.
// Remotion waits for the fonts before it shows or renders a frame.

const loaded = new Map<FontId, string>();

// No style font has Arabic letters: every style falls back on Cairo for them (one variable file,
// 31 KB, for all the weights). It is only downloaded when a caption contains Arabic.
const ARABIC_FAMILY = "Cairo";
export const ARABIC_TEXT = /[؀-ۿݐ-ݿࡰ-ࣿﭐ-﷿ﹰ-﻿]/;
let arabicLoaded = false;

// Same for Devanagari (Hindi, Marathi, Nepali): Noto Sans Devanagari, one variable file.
const DEVANAGARI_FAMILY = "Noto Sans Devanagari";
export const DEVANAGARI_TEXT = /[ऀ-ॿ]/;
let devanagariLoaded = false;

function loadFaces(id: string, awaitAll = false): string {
  const faces = FONT_FACES.filter((face) => face.id === id);
  const family = faces[0]?.family ?? id;
  if (typeof document === "undefined" || typeof FontFace === "undefined") return family;

  const handle = delayRender(`Loading caption font ${id}`);
  Promise.all(
    faces.map(async (face) => {
      const source = new FontFace(
        face.family,
        `url(${staticFile(`fonts/captions/${face.file}`)})`,
        {
          style: face.style,
          weight: face.weight,
          unicodeRange: face.unicodeRange,
          display: "block",
        },
      );
      // latin (French, English, Spanish…) is awaited; latin-ext is registered and fetched by the browser
      // only when a text really needs it, which halves what the gallery downloads at load
      // registered before it is loaded, so document.fonts.check() is false (and the text not
      // measured for good) until the real letters are there
      document.fonts.add(source);
      if (awaitAll || face.unicodeRange.startsWith("U+0000")) await source.load();
    }),
  )
    .catch(() => undefined)
    .finally(() => continueRender(handle));
  return family;
}

// CSS font-family for a font id, loading it the first time.
export function fontFamily(id: FontId): string {
  const known = loaded.get(id);
  if (known) return known;
  const family = `"${loadFaces(id)}", "${ARABIC_FAMILY}", "${DEVANAGARI_FAMILY}", sans-serif`;
  loaded.set(id, family);
  return family;
}

// Loads the fonts of the other scripts a caption needs (Arabic, Devanagari), before its first frame is shown.
export function loadScriptFonts(text: string): void {
  if (!arabicLoaded && ARABIC_TEXT.test(text)) {
    arabicLoaded = true;
    loadFaces("cairo", true);
  }
  if (!devanagariLoaded && DEVANAGARI_TEXT.test(text)) {
    devanagariLoaded = true;
    loadFaces("noto-devanagari", true);
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
