import type { CaptionStyle, TextLook } from "./style";

// The ready-made caption styles. Colours are written here on purpose: captions are part of the video
// and never follow the app palette (docs/DESIGN.md §3). This file is the only allowed exception to the
// "no raw colour" rule (tests/unit/no-raw-colors.test.ts).

export const PRESET_IDS = ["cinema", "elegance", "viral", "karaoke", "neon", "minimal"] as const;
export type PresetId = (typeof PRESET_IDS)[number];

const plain = {
  italic: false,
  letterSpacingEm: 0,
  stroke: null,
  shadow: null,
  glow: null,
  box: null,
} satisfies Partial<TextLook>;

export const CAPTION_PRESETS: Record<PresetId, CaptionStyle> = {
  // Kinetic typography: the key word huge and condensed, the rest small and spaced out.
  cinema: {
    version: 1,
    layout: "stack",
    maxWordsPerPage: 4,
    maxCharsPerLine: 16,
    textCase: "upper",
    position: { x: 50, y: 70 },
    maxWidthPct: 86,
    lineGapEm: -0.1,
    lineBox: null,
    base: {
      ...plain,
      font: "montserrat",
      weight: 700,
      sizePct: 2.4,
      letterSpacingEm: 0.22,
      fill: { type: "solid", color: "#F4F4F5" },
      shadow: { color: "#000000B3", blurEm: 0.3, offsetYEm: 0.06 },
    },
    emphasis: {
      ...plain,
      font: "anton",
      weight: 400,
      sizePct: 8.2,
      letterSpacingEm: 0.01,
      fill: { type: "gradient", from: "#FFFFFF", to: "#C9CDD3", angle: 180 },
      shadow: { color: "#000000A6", blurEm: 0.12, offsetYEm: 0.04 },
    },
    reveal: "page",
    upcomingOpacity: 1,
    active: null,
    animation: { in: "blur", inMs: 420, staggerMs: 70, out: "fade", outMs: 180 },
  },

  // Luxury: an italic serif word in brushed silver, framed by tiny spaced capitals.
  elegance: {
    version: 1,
    layout: "stack",
    maxWordsPerPage: 4,
    maxCharsPerLine: 18,
    textCase: "none",
    position: { x: 50, y: 72 },
    maxWidthPct: 84,
    lineGapEm: 0.05,
    lineBox: null,
    base: {
      ...plain,
      font: "montserrat",
      weight: 500,
      sizePct: 2,
      letterSpacingEm: 0.34,
      fill: { type: "solid", color: "#E9EDF2" },
      shadow: { color: "#00000099", blurEm: 0.35, offsetYEm: 0.05 },
    },
    emphasis: {
      ...plain,
      font: "playfair",
      weight: 700,
      italic: true,
      sizePct: 7.4,
      fill: { type: "gradient", from: "#FBFCFE", to: "#8E98A4", angle: 180 },
      shadow: { color: "#00000080", blurEm: 0.1, offsetYEm: 0.03 },
      glow: { color: "#FFFFFF3D", blurEm: 0.35 },
    },
    reveal: "page",
    upcomingOpacity: 1,
    active: null,
    animation: { in: "rise", inMs: 560, staggerMs: 90, out: "blur", outMs: 220 },
  },

  // Short-form energy: big bold words that pop in exactly when they are spoken.
  viral: {
    version: 1,
    layout: "line",
    maxWordsPerPage: 3,
    maxCharsPerLine: 14,
    textCase: "upper",
    position: { x: 50, y: 68 },
    maxWidthPct: 88,
    lineGapEm: -0.08,
    lineBox: null,
    base: {
      ...plain,
      font: "montserrat",
      weight: 900,
      sizePct: 5.6,
      fill: { type: "solid", color: "#FFFFFF" },
      stroke: { color: "#000000", widthEm: 0.085 },
      shadow: { color: "#000000A6", blurEm: 0.08, offsetYEm: 0.07 },
    },
    emphasis: {
      ...plain,
      font: "montserrat",
      weight: 900,
      sizePct: 6.6,
      fill: { type: "solid", color: "#FFE14D" },
      stroke: { color: "#000000", widthEm: 0.085 },
      shadow: { color: "#000000A6", blurEm: 0.08, offsetYEm: 0.07 },
    },
    reveal: "word",
    upcomingOpacity: 1,
    active: null,
    animation: { in: "pop", inMs: 320, staggerMs: 0, out: "blur", outMs: 140 },
  },

  // Karaoke: the whole sentence is there, the word being said lights up in a coloured box.
  karaoke: {
    version: 1,
    layout: "line",
    maxWordsPerPage: 5,
    maxCharsPerLine: 18,
    textCase: "upper",
    position: { x: 50, y: 74 },
    maxWidthPct: 88,
    lineGapEm: 0.08,
    lineBox: null,
    base: {
      ...plain,
      font: "poppins",
      weight: 800,
      sizePct: 4.4,
      fill: { type: "solid", color: "#FFFFFF" },
      shadow: { color: "#00000099", blurEm: 0.18, offsetYEm: 0.05 },
    },
    emphasis: {
      ...plain,
      font: "poppins",
      weight: 800,
      sizePct: 4.4,
      fill: { type: "solid", color: "#FFFFFF" },
      shadow: { color: "#00000099", blurEm: 0.18, offsetYEm: 0.05 },
    },
    reveal: "page",
    upcomingOpacity: 0.55,
    active: {
      fill: { type: "solid", color: "#FFFFFF" },
      box: { color: "#5B5BF7", radiusEm: 0.2, paddingXEm: 0.16, paddingYEm: 0.04 },
      scale: 1.06,
    },
    animation: { in: "fade", inMs: 160, staggerMs: 0, out: "fade", outMs: 150 },
  },

  // Neon sign: tall condensed letters that glow, the key word in hot pink.
  neon: {
    version: 1,
    layout: "line",
    maxWordsPerPage: 3,
    maxCharsPerLine: 14,
    textCase: "upper",
    position: { x: 50, y: 66 },
    maxWidthPct: 86,
    lineGapEm: -0.12,
    lineBox: null,
    base: {
      ...plain,
      font: "bebas",
      weight: 400,
      sizePct: 6.8,
      letterSpacingEm: 0.04,
      fill: { type: "solid", color: "#F2FFFE" },
      glow: { color: "#2CF6FFCC", blurEm: 0.32 },
    },
    emphasis: {
      ...plain,
      font: "bebas",
      weight: 400,
      sizePct: 7.6,
      letterSpacingEm: 0.04,
      fill: { type: "solid", color: "#FFE3F8" },
      glow: { color: "#FF4FD8E6", blurEm: 0.38 },
    },
    reveal: "word",
    upcomingOpacity: 1,
    active: null,
    animation: { in: "mask", inMs: 340, staggerMs: 0, out: "blur", outMs: 200 },
  },

  // Clean and readable: soft dark band behind the text, like premium TV subtitles.
  minimal: {
    version: 1,
    layout: "line",
    maxWordsPerPage: 7,
    maxCharsPerLine: 26,
    textCase: "none",
    position: { x: 50, y: 82 },
    maxWidthPct: 90,
    lineGapEm: 0.12,
    lineBox: { color: "#0B0B0FC7", radiusEm: 0.28, paddingXEm: 0.45, paddingYEm: 0.14 },
    base: {
      ...plain,
      font: "poppins",
      weight: 600,
      sizePct: 3.2,
      fill: { type: "solid", color: "#FFFFFF" },
    },
    emphasis: {
      ...plain,
      font: "poppins",
      weight: 700,
      sizePct: 3.2,
      fill: { type: "solid", color: "#FFD166" },
    },
    reveal: "page",
    upcomingOpacity: 1,
    active: null,
    animation: { in: "fade", inMs: 200, staggerMs: 0, out: "fade", outMs: 160 },
  },
};

export const DEFAULT_PRESET: PresetId = "cinema";
