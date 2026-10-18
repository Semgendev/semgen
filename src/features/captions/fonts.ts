import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";

import type { FontId } from "./style";

// Caption fonts (all SIL OFL 1.1, see docs/THIRD_PARTY.md). Only the weights and scripts the styles use
// are loaded; Remotion waits for them before showing or rendering a frame.
const SUBSETS = { subsets: ["latin", "latin-ext"] as ("latin" | "latin-ext")[] };

const loaders: Record<FontId, () => string> = {
  anton: () => loadAnton("normal", { weights: ["400"], ...SUBSETS }).fontFamily,
  bebas: () => loadBebas("normal", { weights: ["400"], ...SUBSETS }).fontFamily,
  montserrat: () => {
    loadMontserrat("italic", { weights: ["800", "900"], ...SUBSETS });
    return loadMontserrat("normal", { weights: ["500", "700", "800", "900"], ...SUBSETS })
      .fontFamily;
  },
  playfair: () => {
    loadPlayfair("normal", { weights: ["700", "900"], ...SUBSETS });
    return loadPlayfair("italic", { weights: ["400", "700", "900"], ...SUBSETS }).fontFamily;
  },
  poppins: () =>
    loadPoppins("normal", { weights: ["500", "600", "700", "800", "900"], ...SUBSETS }).fontFamily,
};

const loaded = new Map<FontId, string>();

// CSS font-family for a font id, loading it the first time.
export function fontFamily(id: FontId): string {
  const known = loaded.get(id);
  if (known) return known;
  const family = `"${loaders[id]()}", sans-serif`;
  loaded.set(id, family);
  return family;
}
