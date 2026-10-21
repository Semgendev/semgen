import { describe, expect, it } from "vitest";

import { applyColors, mixHex } from "@/features/captions/colors";
import { letterRiseEm, liquidLevel, motionIn } from "@/features/captions/motion";
import { CAPTION_PRESETS, PRESET_IDS } from "@/features/captions/presets";
import { resolveCaptionStyle } from "@/features/captions/project-style";
import { captionStyleSchema } from "@/features/captions/style";

describe("user colours", () => {
  it("leave the style untouched when none is chosen", () => {
    expect(applyColors(CAPTION_PRESETS.gold, {})).toBe(CAPTION_PRESETS.gold);
  });

  it("blend colours", () => {
    expect(mixHex("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(mixHex("#FF0000", "#FF0000", 0.3)).toBe("#FF0000");
  });

  it("recolour the plain text, keeping its transparency", () => {
    const style = applyColors(CAPTION_PRESETS.gold, { text: "#FFE8A3" });
    expect(style.base.fill).toEqual({ type: "solid", color: "#FFE8A3EB" });
  });

  it("turn the key word into a lit gradient of the chosen colour", () => {
    const style = applyColors(CAPTION_PRESETS.impact, { accent: "#34D399" });
    expect(style.emphasis.fill).toMatchObject({ type: "gradient", via: "#34D399" });
    expect(style.emphasis.deepGlow?.color).toBe("#34D399");
  });

  it("keep the polished-metal reflections on gold", () => {
    const fill = applyColors(CAPTION_PRESETS.gold, { accent: "#A78BFA" }).emphasis.fill;
    expect(fill.type === "gradient" && fill.stops?.length).toBe(5);
  });

  it("recolour the marker and the liquid instead of the text on them", () => {
    const marker = applyColors(CAPTION_PRESETS.highlighter, { accent: "#5EE7FF" }).emphasis;
    expect(marker.box?.color).toBe("#5EE7FF");
    expect(marker.fill).toEqual(CAPTION_PRESETS.highlighter.emphasis.fill);
    const liquid = applyColors(CAPTION_PRESETS.liquid, { accent: "#FF5FA2" }).emphasis;
    expect(liquid.liquid?.fill).toMatchObject({ via: "#FF5FA2" });
    expect(liquid.fill).toEqual(CAPTION_PRESETS.liquid.emphasis.fill);
  });

  it("always give a valid style, whatever the colours", () => {
    for (const id of PRESET_IDS) {
      const style = applyColors(CAPTION_PRESETS[id], { text: "#111111", accent: "#FF7A3D" });
      expect(captionStyleSchema.safeParse(style).success, id).toBe(true);
    }
  });

  it("are read back from the project, broken values being ignored", () => {
    const saved = resolveCaptionStyle({ preset: "glass", colors: { accent: "#FF3B30" } });
    expect(saved.colors).toEqual({ accent: "#FF3B30" });
    expect(resolveCaptionStyle({ preset: "glass", colors: { accent: "red" } }).presetId).toBe(
      "cinema",
    );
  });
});

describe("new entrances", () => {
  it("raise the letters one after the other, all in place at the end", () => {
    expect(letterRiseEm(0, 0, 6)).toBeCloseTo(1.1);
    // halfway: the first letters are up, the last ones still below
    expect(letterRiseEm(0.5, 0, 6)).toBeLessThan(letterRiseEm(0.5, 5, 6));
    expect(letterRiseEm(1, 5, 6)).toBe(0);
    expect(motionIn("riseLetters", 720, 720).letters).toBe(1);
  });

  it("fill the liquid with the voice, never faster than its minimum", () => {
    const word = { start: 1000, end: 1100 };
    expect(liquidLevel(word, 900, 700)).toBe(0);
    expect(liquidLevel(word, 1300, 700)).toBeGreaterThan(0.2);
    expect(liquidLevel(word, 1300, 700)).toBeLessThan(0.8);
    expect(liquidLevel(word, 1700, 700)).toBe(1);
  });
});

describe("colour per idea", () => {
  it("is replaced by the user's own key word colour", () => {
    const prism = CAPTION_PRESETS.prism;
    expect(applyColors(prism, {}).emphasisFills).toBe(prism.emphasisFills);
    expect(applyColors(prism, { accent: "#2F6BFF" }).emphasisFills).toBeUndefined();
  });
});
