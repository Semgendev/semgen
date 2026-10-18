import { describe, expect, it } from "vitest";

import {
  isLandingPath,
  PALETTE_SCRIPT,
  paletteCookie,
  paletteForPath,
  parsePalette,
  readPaletteCookie,
} from "@/features/appearance/palette";

describe("palette", () => {
  it("accepts the three palettes and falls back to cobalt otherwise", () => {
    expect(parsePalette("teal")).toBe("teal");
    expect(parsePalette("etincelle")).toBe("etincelle");
    expect(parsePalette("pink")).toBe("cobalt");
    expect(parsePalette(undefined)).toBe("cobalt");
  });

  it("reads the palette from a cookie header", () => {
    expect(readPaletteCookie("a=1; sg-palette=teal; b=2")).toBe("teal");
    expect(readPaletteCookie("sg-palette=evil<script>")).toBe("cobalt");
    expect(readPaletteCookie("")).toBe("cobalt");
    expect(paletteCookie("teal")).toContain("sg-palette=teal; Path=/");
  });

  it("always shows the brand palette on the landing page", () => {
    for (const path of ["/", "/fr", "/en", "/fr/"]) expect(isLandingPath(path)).toBe(true);
    for (const path of ["/fr/projects", "/settings/appearance", "/french"]) {
      expect(isLandingPath(path)).toBe(false);
    }
    expect(paletteForPath("/fr", "teal")).toBe("cobalt");
    expect(paletteForPath("/fr/projects", "teal")).toBe("teal");
  });

  it("ships a self-contained head script that sets data-palette", () => {
    document.cookie = "sg-palette=teal";
    window.history.pushState({}, "", "/fr/projects");
    new Function(PALETTE_SCRIPT)();
    expect(document.documentElement.getAttribute("data-palette")).toBe("teal");

    window.history.pushState({}, "", "/fr");
    new Function(PALETTE_SCRIPT)();
    expect(document.documentElement.getAttribute("data-palette")).toBe("cobalt");
  });
});
