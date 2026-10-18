import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import tokens from "../../src/styles/tokens.json";

type Mode = Record<string, string>;
type PaletteTokens = { name: string; light: Mode; dark: Mode };
const palettes = tokens as Record<string, PaletteTokens>;

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

// WCAG 2.2 AA: 4.5 for text, 3 for interface parts (docs/DESIGN.md, design brief §4).
const PAIRS: [foreground: string, background: string, minimum: number][] = [
  ["text", "bg", 4.5],
  ["text-2", "surface", 4.5],
  ["text-3", "surface", 4.5],
  ["on-brand", "brand", 4.5],
  ["brand-text", "surface-2", 4.5],
  ["spark-text", "surface", 4.5],
  ["on-spark", "spark", 4.5],
  ["border-strong", "surface", 3],
  ["focus", "bg", 3],
  ["success", "surface", 4.5],
  ["warning", "surface", 4.5],
  ["danger", "surface", 4.5],
  ["info", "surface", 4.5],
];

describe("design tokens contrast (3 palettes x 2 modes)", () => {
  for (const [id, palette] of Object.entries(palettes)) {
    for (const mode of ["light", "dark"] as const) {
      it(`${id} ${mode} meets WCAG AA`, () => {
        const values = palette[mode];
        for (const [fg, bg, minimum] of PAIRS) {
          const ratio = contrast(values[fg] ?? "", values[bg] ?? "");
          expect(
            ratio,
            `${id} ${mode}: ${fg} on ${bg} = ${ratio.toFixed(2)}`,
          ).toBeGreaterThanOrEqual(minimum);
        }
      });
    }
  }
});

describe("tokens.css matches tokens.json", () => {
  const css = readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8");
  const blocks = [...css.matchAll(/\{([^}]*)\}/g)].map((match) =>
    Object.fromEntries(
      [...(match[1] ?? "").matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [
        m[1],
        m[2]?.toUpperCase(),
      ]),
    ),
  );

  it("has one block per palette and mode, in order, with identical values", () => {
    const expected = Object.values(palettes).flatMap((palette) => [palette.light, palette.dark]);
    expect(blocks).toHaveLength(expected.length);
    expected.forEach((mode, index) => {
      const upper = Object.fromEntries(Object.entries(mode).map(([k, v]) => [k, v.toUpperCase()]));
      expect(blocks[index]).toEqual(upper);
    });
  });
});
