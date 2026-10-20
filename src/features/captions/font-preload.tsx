import { preload } from "react-dom";

import { FONT_FACES } from "./fonts-data";
import { CAPTION_PRESETS, PRESET_IDS, type PresetId } from "./presets";

// How many cards of the gallery are in view when the page opens: their fonts are fetched at once,
// the others when their card scrolls into view.
const CARDS_IN_VIEW = 6;

// Files of the faces (weight + slant) that the cards in view use, latin letters only: it is what
// the previews wait for.
function filesFor(ids: PresetId[]): string[] {
  const wanted = new Set<string>();
  for (const id of ids) {
    const style = CAPTION_PRESETS[id];
    for (const look of [style.base, style.emphasis]) {
      wanted.add(`${look.font}|${look.italic ? "italic" : "normal"}|${look.weight}`);
    }
  }
  return [
    ...new Set(
      FONT_FACES.filter(
        (face) =>
          face.unicodeRange.startsWith("U+0000") &&
          wanted.has(`${face.id}|${face.style}|${face.weight}`),
      ).map((face) => face.file),
    ),
  ];
}

// Server component: asks the browser to start downloading the caption fonts while it parses the
// page, long before the previews exist, so the animations can start as soon as the scripts run.
// `selected` is the style chosen for the project: its font comes first.
export function CaptionFontPreload({ selected }: { selected?: PresetId }) {
  const ids = [
    ...new Set([...(selected ? [selected] : []), ...PRESET_IDS.slice(0, CARDS_IN_VIEW)]),
  ];
  for (const file of filesFor(ids)) {
    preload(`/fonts/captions/${file}`, {
      as: "font",
      type: "font/woff2",
      crossOrigin: "anonymous",
    });
  }
  return null;
}
