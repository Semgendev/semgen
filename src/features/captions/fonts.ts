import { continueRender, delayRender, staticFile } from "remotion";

import { FONT_FACES } from "./fonts-data";
import type { FontId } from "./style";

// Caption fonts (all SIL OFL 1.1, see docs/THIRD_PARTY.md), served by the app itself from
// public/fonts/captions (see scripts/host-caption-fonts.mjs): no request to a third party, and the
// browser caches them for a year. Only the weights and scripts the styles use are shipped.
// Remotion waits for the fonts before it shows or renders a frame.

const loaded = new Map<FontId, string>();

function loadFaces(id: FontId): string {
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
      if (face.unicodeRange.startsWith("U+0000")) document.fonts.add(await source.load());
      else document.fonts.add(source);
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
  const family = `"${loadFaces(id)}", sans-serif`;
  loaded.set(id, family);
  return family;
}
