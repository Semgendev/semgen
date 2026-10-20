import { describe, expect, it } from "vitest";

import { applyColors, hexToRgb, parseHexInput } from "@/features/captions/colors";
import { CAPTION_PRESETS, PRESET_IDS } from "@/features/captions/presets";
import { resolveCaptionStyle } from "@/features/captions/project-style";
import { captionStyleSchema } from "@/features/captions/style";
import {
  TWEAK_ANIMATIONS,
  TWEAK_POSITIONS,
  applyTweaks,
  captionTweaksSchema,
  hasTweaks,
} from "@/features/captions/tweaks";
import { FONT_FACES } from "@/features/captions/fonts-data";
import { FONT_IDS } from "@/features/captions/style";

const cinema = CAPTION_PRESETS.cinema;
const liquid = CAPTION_PRESETS.liquid;

describe("caption tweaks", () => {
  it("changes nothing when there is no tweak", () => {
    expect(applyTweaks(cinema, {})).toBe(cinema);
    expect(applyTweaks(cinema, undefined)).toBe(cinema);
    expect(hasTweaks({})).toBe(false);
  });

  it("never mutates the preset", () => {
    const before = JSON.stringify(cinema);
    applyTweaks(cinema, { font: "sora", position: "top", animation: "pop" });
    expect(JSON.stringify(cinema)).toBe(before);
  });

  it("gives every font a weight it really has, for every style", () => {
    for (const id of PRESET_IDS) {
      for (const font of FONT_IDS) {
        const style = applyTweaks(CAPTION_PRESETS[id], { font });
        for (const look of [style.base, style.emphasis]) {
          const faces = FONT_FACES.filter(
            (face) =>
              face.id === font && face.style === (look.italic ? "italic" : "normal") && face.file,
          );
          expect(faces.length, `${id} ${font}`).toBeGreaterThan(0);
          expect(
            faces.some((face) => Number(face.weight) === look.weight),
            `${id} ${font} weight ${look.weight}`,
          ).toBe(true);
        }
      }
    }
  });

  it("drops italics when the font has none", () => {
    const italicStyle = PRESET_IDS.map((id) => CAPTION_PRESETS[id]).find(
      (style) => style.base.italic || style.emphasis.italic,
    );
    expect(italicStyle).toBeDefined();
    const style = applyTweaks(italicStyle!, { font: "anton" });
    expect(style.base.italic).toBe(false);
    expect(style.emphasis.italic).toBe(false);
  });

  it("moves the captions to the top, the middle or the bottom", () => {
    const ys = TWEAK_POSITIONS.map((position) => applyTweaks(cinema, { position }).position.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect(new Set(ys).size).toBe(3);
    expect(ys.every((y) => y >= 10 && y <= 86)).toBe(true);
  });

  it("sets the entrance of the words and of the key word", () => {
    for (const animation of TWEAK_ANIMATIONS) {
      const style = applyTweaks(cinema, { animation });
      expect(style.animation.in).toBe(animation);
      if (style.animation.emphasis) expect(style.animation.emphasis.in).toBe(animation);
    }
  });

  it("draws, or removes, the outline", () => {
    const thin = applyTweaks(cinema, { outline: { size: "thin", color: "#112233" } });
    const thick = applyTweaks(cinema, { outline: { size: "thick", color: "#112233" } });
    expect(thin.base.stroke?.color).toBe("#112233");
    expect(thick.base.stroke!.widthEm).toBeGreaterThan(thin.base.stroke!.widthEm);
    expect(
      applyTweaks(cinema, { outline: { size: "none", color: "#000000" } }).base.stroke,
    ).toBeNull();
  });

  it("keeps the outline that a liquid fill needs", () => {
    const style = applyTweaks(liquid, { outline: { size: "none", color: "#000000" } });
    expect(style.emphasis.stroke).toEqual(liquid.emphasis.stroke);
  });

  it("always gives a style the schema accepts", () => {
    for (const id of PRESET_IDS) {
      const style = applyTweaks(applyColors(CAPTION_PRESETS[id], { text: "#FF0000" }), {
        font: "bebas",
        animation: "typewriter",
        position: "middle",
        outline: { size: "thick", color: "#FFFFFF" },
      });
      expect(captionStyleSchema.safeParse(style).success, id).toBe(true);
    }
  });

  it("rejects unknown values and bad colours", () => {
    expect(captionTweaksSchema.safeParse({ font: "comic" }).success).toBe(false);
    expect(captionTweaksSchema.safeParse({ position: "left" }).success).toBe(false);
    expect(captionTweaksSchema.safeParse({ outline: { size: "thin", color: "red" } }).success).toBe(
      false,
    );
    expect(captionTweaksSchema.safeParse({ font: "sora", animation: "pop" }).success).toBe(true);
  });
});

describe("stored project style", () => {
  it("reads old rows that have no tweaks", () => {
    const resolved = resolveCaptionStyle({ preset: "cinema", colors: { text: "#00FF00" } });
    expect(resolved.tweaks).toEqual({});
    expect(resolved.presetId).toBe("cinema");
  });

  it("applies the stored tweaks", () => {
    const resolved = resolveCaptionStyle({ preset: "cinema", tweaks: { position: "top" } });
    expect(resolved.tweaks).toEqual({ position: "top" });
    expect(resolved.style.position.y).toBeLessThan(cinema.position.y);
  });

  it("falls back to the default style on garbage", () => {
    expect(resolveCaptionStyle({ preset: "nope" }).tweaks).toEqual({});
    expect(resolveCaptionStyle(null).tweaks).toEqual({});
  });
});

describe("two fonts and sizes", () => {
  it("applies one font to the text and another to the key word", () => {
    const style = applyTweaks(cinema, { fonts: { text: "anton", emphasis: "sora" } });
    expect(style.base.font).toBe("anton");
    expect(style.emphasis.font).toBe("sora");
  });

  it("changes only the look that was chosen", () => {
    const style = applyTweaks(cinema, { fonts: { emphasis: "sora" } });
    expect(style.base.font).toBe(cinema.base.font);
    expect(style.emphasis.font).toBe("sora");
  });

  it("still reads the first version's single font for both looks", () => {
    const style = applyTweaks(cinema, { font: "bebas" });
    expect(style.base.font).toBe("bebas");
    expect(style.emphasis.font).toBe("bebas");
  });

  it("scales the size of the text and of the key word separately, within the schema", () => {
    const style = applyTweaks(cinema, { sizes: { text: 120, emphasis: 80 } });
    expect(style.base.sizePct).toBeCloseTo(cinema.base.sizePct * 1.2);
    expect(style.emphasis.sizePct).toBeCloseTo(cinema.emphasis.sizePct * 0.8);
    const huge = applyTweaks(cinema, { sizes: { text: 160, emphasis: 160 } });
    expect(captionStyleSchema.safeParse(huge).success).toBe(true);
  });

  it("rejects sizes out of range", () => {
    expect(captionTweaksSchema.safeParse({ sizes: { text: 10 } }).success).toBe(false);
    expect(captionTweaksSchema.safeParse({ sizes: { text: 300 } }).success).toBe(false);
    expect(captionTweaksSchema.safeParse({ sizes: { text: 115 } }).success).toBe(true);
  });

  it("offers an extra thick outline", () => {
    const heavy = applyTweaks(cinema, { outline: { size: "heavy", color: "#000000" } });
    const thick = applyTweaks(cinema, { outline: { size: "thick", color: "#000000" } });
    expect(heavy.base.stroke!.widthEm).toBeGreaterThan(thick.base.stroke!.widthEm);
  });
});

describe("colour codes typed by a person", () => {
  it("accepts 6 digits with or without #, in any case, with spaces", () => {
    expect(parseHexInput("#ffffff")).toBe("#FFFFFF");
    expect(parseHexInput("FFFFFF")).toBe("#FFFFFF");
    expect(parseHexInput("  #00ff7f ")).toBe("#00FF7F");
    expect(parseHexInput("00ff7f")).toBe("#00FF7F");
  });

  it("expands 3 digits", () => {
    expect(parseHexInput("#fa0")).toBe("#FFAA00");
    expect(parseHexInput("000")).toBe("#000000");
  });

  it("refuses anything else", () => {
    for (const bad of ["", "#", "12", "1234", "12345", "GGGGGG", "#12345678", "red", "##FFFFFF"]) {
      expect(parseHexInput(bad), bad).toBeNull();
    }
  });

  it("gives the red, green and blue values", () => {
    expect(hexToRgb("#FFFFFF")).toEqual([255, 255, 255]);
    expect(hexToRgb("#FF8800")).toEqual([255, 136, 0]);
  });
});
