import { z } from "zod";

import { FONT_FACES } from "./fonts-data";
import { FONT_IDS, type AnimationIn, type CaptionStyle, type FontId, type TextLook } from "./style";

// What a user can change on top of a style, beyond its two colours: the font, how the text comes in,
// where it sits and its outline. Each one is optional: absent = the style as designed.

export const TWEAK_ANIMATIONS = ["none", "fade", "pop", "rise", "blur", "typewriter"] as const;
export const TWEAK_POSITIONS = ["top", "middle", "bottom"] as const;
export const OUTLINE_SIZES = ["none", "thin", "thick"] as const;
export type TweakAnimation = (typeof TWEAK_ANIMATIONS)[number];
export type TweakPosition = (typeof TWEAK_POSITIONS)[number];
export type OutlineSize = (typeof OUTLINE_SIZES)[number];

const hex6 = z.string().regex(/^#[0-9a-fA-F]{6}$/, "6 digit hex");

export const captionTweaksSchema = z.object({
  font: z.enum(FONT_IDS).optional(),
  animation: z.enum(TWEAK_ANIMATIONS).optional(),
  position: z.enum(TWEAK_POSITIONS).optional(),
  outline: z.object({ size: z.enum(OUTLINE_SIZES), color: hex6 }).optional(),
});
export type CaptionTweaks = z.infer<typeof captionTweaksSchema>;

// Centre of the caption block in % of the frame height (the fit then keeps it in the safe zone).
const POSITION_Y: Record<TweakPosition, number> = { top: 16, middle: 50, bottom: 78 };
// Stroke width in em: half of it is hidden under the letters (paint order "stroke fill").
const OUTLINE_WIDTH: Record<Exclude<OutlineSize, "none">, number> = { thin: 0.05, thick: 0.1 };

export function hasTweaks(tweaks: CaptionTweaks | undefined): boolean {
  return Boolean(tweaks?.font || tweaks?.animation || tweaks?.position || tweaks?.outline);
}

type Weight = TextLook["weight"];
const WEIGHTS: readonly Weight[] = [400, 500, 600, 700, 800, 900];

// The weights a font really has: asking for another one would be faked by the browser.
function weightsOf(font: FontId, italic: boolean): Weight[] {
  const wanted = italic ? "italic" : "normal";
  const found = new Set(
    FONT_FACES.filter((face) => face.id === font && face.style === wanted).map((face) =>
      Number(face.weight),
    ),
  );
  return WEIGHTS.filter((weight) => found.has(weight));
}

function withFont(look: TextLook, font: FontId): TextLook {
  const italic = look.italic && weightsOf(font, true).length > 0;
  const weights = weightsOf(font, italic);
  const weight = weights.reduce<Weight>(
    (best, candidate) =>
      Math.abs(candidate - look.weight) < Math.abs(best - look.weight) ? candidate : best,
    weights[0] ?? look.weight,
  );
  return { ...look, font, italic, weight };
}

// A look whose outline is part of its design (the liquid fill needs it): left alone.
function withOutline(look: TextLook, outline: NonNullable<CaptionTweaks["outline"]>): TextLook {
  if (look.liquid) return look;
  return {
    ...look,
    stroke:
      outline.size === "none"
        ? null
        : { color: outline.color, widthEm: OUTLINE_WIDTH[outline.size] },
  };
}

// A style with the user's adjustments applied.
export function applyTweaks(style: CaptionStyle, tweaks: CaptionTweaks | undefined): CaptionStyle {
  if (!hasTweaks(tweaks) || !tweaks) return style;
  let next: CaptionStyle = style;
  const { font, animation, position, outline } = tweaks;
  if (font)
    next = { ...next, base: withFont(next.base, font), emphasis: withFont(next.emphasis, font) };
  if (outline) {
    next = {
      ...next,
      base: withOutline(next.base, outline),
      emphasis: withOutline(next.emphasis, outline),
    };
  }
  if (position) next = { ...next, position: { ...next.position, y: POSITION_Y[position] } };
  if (animation) {
    const entrance: AnimationIn = animation;
    next = {
      ...next,
      animation: {
        ...next.animation,
        in: entrance,
        emphasis: next.animation.emphasis
          ? { ...next.animation.emphasis, in: entrance }
          : undefined,
      },
    };
  }
  return next;
}
