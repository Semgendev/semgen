import { preload } from "react-dom";

import { FONT_FACES } from "./fonts-data";
import { CAPTION_PRESETS, PRESET_IDS } from "./presets";

// Files of the fonts the gallery needs (latin only: it is what the previews wait for).
const FILES = (() => {
  const ids = new Set<string>();
  for (const id of PRESET_IDS) {
    const style = CAPTION_PRESETS[id];
    ids.add(style.base.font);
    ids.add(style.emphasis.font);
  }
  return [
    ...new Set(
      FONT_FACES.filter((face) => ids.has(face.id) && face.unicodeRange.startsWith("U+0000")).map(
        (face) => face.file,
      ),
    ),
  ];
})();

// Server component: asks the browser to start downloading the caption fonts while it parses the
// page, long before the previews exist, so the animations can start as soon as the scripts run.
export function CaptionFontPreload() {
  for (const file of FILES) {
    preload(`/fonts/captions/${file}`, {
      as: "font",
      type: "font/woff2",
      crossOrigin: "anonymous",
    });
  }
  return null;
}
