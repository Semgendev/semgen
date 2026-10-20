import { z } from "zod";

import { MIX_BLACK as BLACK, MIX_WHITE as WHITE } from "./presets";
import type { CaptionFill, CaptionStyle, TextLook } from "./style";

// The two colours a user can change on any style: the plain text, and the key word (its gradient,
// its marker, its liquid...). Everything else (shadows, sizes, animation) stays as designed.

const hex6 = z.string().regex(/^#[0-9a-fA-F]{6}$/, "6 digit hex");
export const captionColorsSchema = z.object({ text: hex6.optional(), accent: hex6.optional() });
export type CaptionColors = z.infer<typeof captionColorsSchema>;

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)) as [number, number, number];
}

// Blend of two "#RRGGBB" colours: t = 0 → a, t = 1 → b.
export function mixHex(a: string, b: string, t: number): string {
  const [ra, ga, ba] = channels(a);
  const [rb, gb, bb] = channels(b);
  const part = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${part(ra, rb)}${part(ga, gb)}${part(ba, bb)}`.toUpperCase();
}

// A lit gradient built from one colour: a bright top, the colour, a deep bottom. Polished metal
// styles (several stops) get a second reflection, like the original.
export function accentFill(accent: string, original: CaptionFill): CaptionFill {
  const light = mixHex(accent, WHITE, 0.7);
  const dark = mixHex(accent, BLACK, 0.35);
  if (original.type === "gradient" && original.stops) {
    return {
      type: "gradient",
      from: light,
      to: mixHex(accent, BLACK, 0.45),
      angle: original.angle,
      stops: [
        { color: light, atPct: 0 },
        { color: accent, atPct: 38 },
        { color: dark, atPct: 55 },
        { color: mixHex(accent, WHITE, 0.5), atPct: 72 },
        { color: mixHex(accent, BLACK, 0.45), atPct: 100 },
      ],
    };
  }
  return {
    type: "gradient",
    from: light,
    via: accent,
    to: dark,
    angle: original.type === "gradient" ? original.angle : 180,
  };
}

// Plain text: same colour, keeping the transparency the style had (e.g. 90 % white).
function textFill(text: string, original: CaptionFill): CaptionFill {
  if (original.type === "solid") return { type: "solid", color: text + original.color.slice(7) };
  return { type: "gradient", from: text, to: mixHex(text, BLACK, 0.12), angle: original.angle };
}

function withAccent(look: TextLook, accent: string): TextLook {
  const next: TextLook = { ...look };
  if (look.liquid) {
    next.liquid = {
      ...look.liquid,
      fill: accentFill(accent, look.liquid.fill),
      glow: `${accent}99`,
    };
  } else if (look.box?.drawMs && !look.box.glass) {
    // a marker: the stroke takes the colour, the ink on it stays readable
    next.box = { ...look.box, color: accent };
  } else {
    next.fill = accentFill(accent, look.fill);
  }
  if (look.deepGlow) next.deepGlow = { ...look.deepGlow, color: accent };
  return next;
}

// A style with the user's colours applied.
export function applyColors(style: CaptionStyle, colors: CaptionColors | undefined): CaptionStyle {
  if (!colors?.text && !colors?.accent) return style;
  return {
    ...style,
    base: colors.text
      ? { ...style.base, fill: textFill(colors.text, style.base.fill) }
      : style.base,
    emphasis: colors.accent ? withAccent(style.emphasis, colors.accent) : style.emphasis,
  };
}

// Reads a colour typed or pasted by a person: with or without "#", 3 or 6 digits, any case,
// spaces around. Returns "#RRGGBB" in capitals, or null when it is not a colour.
export function parseHexInput(raw: string): string | null {
  const digits = raw.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(digits)) {
    return `#${digits
      .split("")
      .map((digit) => digit + digit)
      .join("")}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(digits)) return `#${digits}`.toUpperCase();
  return null;
}

// a six-digit hex colour gives its red, green and blue values (0 to 255)
export function hexToRgb(hex: string): [number, number, number] {
  return channels(hex);
}
