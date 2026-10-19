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
  const family = `"${loadFaces(id)}", "${ARABIC_FAMILY}", sans-serif`;
  loaded.set(id, family);
  return family;
}

// Loads the fonts of the other scripts a caption needs (Arabic), before its first frame is shown.
export function loadScriptFonts(text: string): void {
  if (arabicLoaded || !ARABIC_TEXT.test(text)) return;
  arabicLoaded = true;
  loadFaces("cairo", true);
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
