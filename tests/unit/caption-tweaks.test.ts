import { describe, expect, it } from "vitest";

import { applyColors } from "@/features/captions/colors";
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
