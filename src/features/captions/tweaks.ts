import { z } from "zod";

import { FONT_FACES } from "./fonts-data";
import { FONT_IDS, type AnimationIn, type CaptionStyle, type FontId, type TextLook } from "./style";

// What a user can change on top of a style, beyond its two colours: the fonts, the sizes, how the
// text comes in, where it sits and its outline. Each one is optional: absent = the style as designed.

export const TWEAK_ANIMATIONS = ["none", "fade", "pop", "rise", "blur", "typewriter"] as const;
export const TWEAK_POSITIONS = ["top", "middle", "bottom"] as const;
export const OUTLINE_SIZES = ["none", "thin", "thick", "heavy"] as const;
export type TweakAnimation = (typeof TWEAK_ANIMATIONS)[number];
export type TweakPosition = (typeof TWEAK_POSITIONS)[number];
export type OutlineSize = (typeof OUTLINE_SIZES)[number];

// Size of the text and of the key word, in % of what the style defines (100 = as designed).
export const SIZE_MIN = 60;
export const SIZE_MAX = 160;
export const SIZE_STEP = 5;
export const SIZE_DEFAULT = 100;

// Strength of the light of a style (glow, rays, flame), in % of what the style defines.
export const GLOW_MIN = 0;
export const GLOW_MAX = 200;
export const GLOW_STEP = 10;

const hex6 = z.string().regex(/^#[0-9a-fA-F]{6}$/, "6 digit hex");
const fontId = z.enum(FONT_IDS);
const sizePct = z.number().int().min(SIZE_MIN).max(SIZE_MAX);

export const captionTweaksSchema = z.object({
  // first version: one font for both looks; still read, no longer written
  font: fontId.optional(),
  // a style has two fonts: the one of the text and the one of the key word
  fonts: z.object({ text: fontId.optional(), emphasis: fontId.optional() }).optional(),
  sizes: z.object({ text: sizePct.optional(), emphasis: sizePct.optional() }).optional(),
  animation: z.enum(TWEAK_ANIMATIONS).optional(),
  position: z.enum(TWEAK_POSITIONS).optional(),
  outline: z.object({ size: z.enum(OUTLINE_SIZES), color: hex6 }).optional(),
  glow: z.number().int().min(GLOW_MIN).max(GLOW_MAX).optional(),
  // how visible the copies of an echo column are, in % of the style
  echo: z.number().int().min(GLOW_MIN).max(GLOW_MAX).optional(),
});
export type CaptionTweaks = z.infer<typeof captionTweaksSchema>;

// Centre of the caption block in % of the frame height (the fit then keeps it in the safe zone).
const POSITION_Y: Record<TweakPosition, number> = { top: 16, middle: 50, bottom: 78 };
// Stroke width in em: half of it is hidden under the letters (paint order "stroke fill").
const OUTLINE_WIDTH: Record<Exclude<OutlineSize, "none">, number> = {
  thin: 0.05,
  thick: 0.1,
  heavy: 0.14,
};

export function hasTweaks(tweaks: CaptionTweaks | undefined): boolean {
  if (!tweaks) return false;
  return Boolean(
    tweaks.font ||
    tweaks.fonts?.text ||
    tweaks.fonts?.emphasis ||
    tweaks.sizes?.text ||
    tweaks.sizes?.emphasis ||
    tweaks.animation ||
    tweaks.position ||
    tweaks.outline ||
    tweaks.glow !== undefined ||
    tweaks.echo !== undefined,
  );
}

// True when the key word of the style unrolls an echo column.
export function hasEcho(style: CaptionStyle): boolean {
  return Boolean(style.emphasis.echo);
}

// True when the style has a light the user can make softer or stronger.
export function hasLight(style: CaptionStyle): boolean {
  return [style.base, style.emphasis].some(
    (look) =>
      Boolean(look.deepGlow) || Boolean(look.rays) || Boolean(look.haze) || Boolean(look.glow),
  );
}

// "#RRGGBBAA" (or "#RRGGBB") with its opacity multiplied.
function scaleAlpha(color: string, factor: number): string {
  const alpha = color.length === 9 ? parseInt(color.slice(7), 16) : 255;
  const next = Math.round(Math.min(255, Math.max(0, alpha * factor)));
  return `${color.slice(0, 7)}${next.toString(16).padStart(2, "0").toUpperCase()}`;
}

function withLight(look: TextLook, percent: number): TextLook {
  const factor = percent / 100;
  return {
    ...look,
    glow: look.glow ? { ...look.glow, color: scaleAlpha(look.glow.color, factor) } : look.glow,
    deepGlow: look.deepGlow
      ? { ...look.deepGlow, intensity: Math.min(2, look.deepGlow.intensity * factor) }
      : look.deepGlow,
    rays: look.rays ? { ...look.rays, color: scaleAlpha(look.rays.color, factor) } : look.rays,
    haze: look.haze
      ? { ...look.haze, opacity: Math.min(1, look.haze.opacity * factor) }
      : look.haze,
  };
}

// The font chosen for each look (the old single `font` counts for both).
export function chosenFonts(tweaks: CaptionTweaks): { text?: FontId; emphasis?: FontId } {
  return {
    text: tweaks.fonts?.text ?? tweaks.font,
    emphasis: tweaks.fonts?.emphasis ?? tweaks.font,
  };
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

function withSize(look: TextLook, percent: number): TextLook {
  return { ...look, sizePct: Math.min(20, (look.sizePct * percent) / 100) };
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
  if (!tweaks || !hasTweaks(tweaks)) return style;
  let next: CaptionStyle = style;
  const fonts = chosenFonts(tweaks);
  if (fonts.text) next = { ...next, base: withFont(next.base, fonts.text) };
  if (fonts.emphasis) next = { ...next, emphasis: withFont(next.emphasis, fonts.emphasis) };
  if (tweaks.sizes?.text) next = { ...next, base: withSize(next.base, tweaks.sizes.text) };
  if (tweaks.sizes?.emphasis) {
    next = { ...next, emphasis: withSize(next.emphasis, tweaks.sizes.emphasis) };
  }
  if (tweaks.outline) {
    next = {
      ...next,
      base: withOutline(next.base, tweaks.outline),
      emphasis: withOutline(next.emphasis, tweaks.outline),
    };
  }
  if (tweaks.glow !== undefined) {
    next = {
      ...next,
      base: withLight(next.base, tweaks.glow),
      emphasis: withLight(next.emphasis, tweaks.glow),
    };
  }
  if (tweaks.echo !== undefined && next.emphasis.echo) {
    next = {
      ...next,
      emphasis: {
        ...next.emphasis,
        echo: { ...next.emphasis.echo, opacity: tweaks.echo / 100 },
      },
    };
  }
  if (tweaks.position) {
    next = { ...next, position: { ...next.position, y: POSITION_Y[tweaks.position] } };
  }
  if (tweaks.animation) {
    const entrance: AnimationIn = tweaks.animation;
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
