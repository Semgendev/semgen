import type { CaptionStyle, TextLook } from "./style";

// The ready-made caption styles. Colours are written here on purpose: captions are part of the video
// and never follow the app palette (docs/DESIGN.md §3). This file is the only allowed exception to the
// "no raw colour" rule (tests/unit/no-raw-colors.test.ts).
// Every style only animates how the words appear: the block itself never travels across the frame.

export const PRESET_IDS = [
  "cinema",
  "elegance",
  "editorial",
  "signature",
  "minimal",
  "pop",
  "highlighter",
  "converge",
  "impact",
  "gold",
  "glass",
  "liquid",
] as const;
export type PresetId = (typeof PRESET_IDS)[number];

const plain = {
  italic: false,
  letterSpacingEm: 0,
  stroke: null,
  shadow: null,
  glow: null,
  box: null,
} satisfies Partial<TextLook>;

// Soft shadow that detaches the text from any footage without looking "outlined".
const softShadow = { color: "#000000A6", blurEm: 0.28, offsetYEm: 0.04 };

const FIRST_PRESETS: Omit<Record<PresetId, CaptionStyle>, "gold" | "glass" | "liquid"> = {
  // Kinetic typography: the key word huge and condensed, the rest small and spaced out.
  cinema: {
    version: 1,
    layout: "stack",
    maxWordsPerPage: 4,
    maxCharsPerLine: 16,
    textCase: "upper",
    position: { x: 50, y: 66 },
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
    position: { x: 50, y: 66 },
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

  // Magazine editorial: a small clean sentence, then the key word in a large italic serif with a
  // warm, lit gradient. Every word comes into focus as it is said.
  editorial: {
    version: 1,
    layout: "stack",
    maxWordsPerPage: 5,
    maxCharsPerLine: 22,
    textCase: "none",
    position: { x: 50, y: 64 },
    maxWidthPct: 84,
    lineGapEm: -0.05,
    lineBox: null,
    base: {
      ...plain,
      font: "inter-tight",
      weight: 500,
      sizePct: 2.5,
      letterSpacingEm: -0.01,
      fill: { type: "solid", color: "#FFFFFFE6" },
      shadow: softShadow,
    },
    emphasis: {
      ...plain,
      font: "instrument",
      weight: 400,
      italic: true,
      sizePct: 8.6,
      letterSpacingEm: -0.01,
      fill: { type: "gradient", from: "#FFFFFF", via: "#FFF5E6", to: "#E6D2B0", angle: 180 },
      shadow: { color: "#00000080", blurEm: 0.12, offsetYEm: 0.03 },
      deepGlow: { color: "#FFE2B8", radiusEm: 0.3, intensity: 0.35, chromatic: null },
    },
    reveal: "word",
    upcomingOpacity: 1,
    active: null,
    animation: {
      in: "blurRise",
      inMs: 460,
      staggerMs: 0,
      out: "blur",
      outMs: 220,
      emphasis: { in: "blurRise", inMs: 640 },
    },
  },

  // Handwritten: the soft words are written in ink from left to right in a fine script, the key
  // word lands below in a crisp bold sans.
  signature: {
    version: 1,
    layout: "stack",
    maxWordsPerPage: 5,
    maxCharsPerLine: 20,
    textCase: "none",
    position: { x: 50, y: 64 },
    maxWidthPct: 84,
    lineGapEm: -0.12,
    lineBox: null,
    base: {
      ...plain,
      font: "pinyon",
      weight: 400,
      sizePct: 5.2,
      fill: { type: "gradient", from: "#FFFFFF", to: "#F4E6CF", angle: 180 },
      shadow: softShadow,
    },
    emphasis: {
      ...plain,
      font: "inter-tight",
      weight: 800,
      sizePct: 6.2,
      letterSpacingEm: -0.03,
      fill: { type: "gradient", from: "#FFFFFF", via: "#FFFFFF", to: "#CBD3E1", angle: 180 },
      shadow: softShadow,
    },
    reveal: "word",
    upcomingOpacity: 1,
    active: null,
    animation: {
      in: "ink",
      inMs: 760,
      staggerMs: 0,
      out: "blur",
      outMs: 220,
      emphasis: { in: "blurRise", inMs: 520 },
    },
  },

  // Quiet and precise: each word breathes in, its letters closing up softly.
  minimal: {
    version: 1,
    layout: "line",
    maxWordsPerPage: 7,
    maxCharsPerLine: 24,
    textCase: "none",
    position: { x: 50, y: 70 },
    maxWidthPct: 86,
    lineGapEm: 0.1,
    lineBox: null,
    base: {
      ...plain,
      font: "manrope",
      weight: 600,
      sizePct: 3.1,
      fill: { type: "solid", color: "#FFFFFF" },
      shadow: softShadow,
    },
    emphasis: {
      ...plain,
      font: "manrope",
      weight: 700,
      sizePct: 3.1,
      fill: { type: "gradient", from: "#FFFFFF", to: "#FFE3A8", angle: 180 },
      shadow: softShadow,
    },
    reveal: "word",
    upcomingOpacity: 1,
    active: null,
    animation: { in: "breathe", inMs: 700, staggerMs: 0, out: "fade", outMs: 200 },
  },

  // Spring pop: words bounce in on a real spring as they are said, the key word in molten gold
  // with a deep glow and a light sweep.
  pop: {
    version: 1,
    layout: "line",
    maxWordsPerPage: 4,
    maxCharsPerLine: 13,
    textCase: "none",
    position: { x: 50, y: 64 },
    maxWidthPct: 86,
    lineGapEm: -0.04,
    lineBox: null,
    base: {
      ...plain,
      font: "bricolage",
      weight: 800,
      sizePct: 5.4,
      letterSpacingEm: -0.02,
      fill: { type: "gradient", from: "#FFFFFF", to: "#E3E9FF", angle: 180 },
      shadow: { color: "#000000B3", blurEm: 0.18, offsetYEm: 0.05 },
    },
    emphasis: {
      ...plain,
      font: "bricolage",
      weight: 800,
      sizePct: 7.4,
      letterSpacingEm: -0.02,
      fill: { type: "gradient", from: "#FFF6C4", via: "#FFD24A", to: "#FF8A1F", angle: 180 },
      shadow: { color: "#00000099", blurEm: 0.14, offsetYEm: 0.04 },
      deepGlow: { color: "#FF9A1F", radiusEm: 0.22, intensity: 1, chromatic: null },
      sweep: { color: "#FFFFFFCC", angle: 110, widthPct: 22, periodMs: 2600 },
    },
    reveal: "word",
    upcomingOpacity: 1,
    active: null,
    animation: {
      in: "pop",
      inMs: 420,
      staggerMs: 0,
      out: "blur",
      outMs: 140,
      spring: { stiffness: 220, damping: 14, mass: 0.6 },
      motionBlur: true,
    },
  },

  // Highlighter: a marker stroke is drawn behind the key word the moment it is said, and the word
  // turns to dark ink on it.
  highlighter: {
    version: 1,
    layout: "line",
    maxWordsPerPage: 6,
    maxCharsPerLine: 18,
    textCase: "none",
    position: { x: 50, y: 66 },
    maxWidthPct: 86,
    lineGapEm: 0.04,
    lineBox: null,
    base: {
      ...plain,
      font: "fraunces",
      weight: 600,
      sizePct: 4.3,
      letterSpacingEm: -0.01,
      fill: { type: "solid", color: "#FFFFFF" },
      shadow: softShadow,
    },
    emphasis: {
      ...plain,
      font: "fraunces",
      weight: 400,
      italic: true,
      sizePct: 4.7,
      fill: { type: "solid", color: "#16120D" },
      box: {
        color: "#F4D46E",
        radiusEm: 0.06,
        paddingXEm: 0.14,
        paddingYEm: 0.02,
        drawMs: 420,
        skewDeg: -6,
      },
    },
    reveal: "word",
    upcomingOpacity: 1,
    active: null,
    animation: { in: "blurRise", inMs: 460, staggerMs: 0, out: "blur", outMs: 200 },
  },

  // Convergence: small spaced capitals, then the key word whose letters gather from the centre,
  // out of focus, in a champagne gradient.
  converge: {
    version: 1,
    layout: "stack",
    maxWordsPerPage: 5,
    maxCharsPerLine: 20,
    textCase: "upper",
    position: { x: 50, y: 64 },
    maxWidthPct: 84,
    lineGapEm: 0,
    lineBox: null,
    base: {
      ...plain,
      font: "syne",
      weight: 600,
      sizePct: 2.2,
      letterSpacingEm: 0.12,
      fill: { type: "solid", color: "#FFFFFFD9" },
      shadow: softShadow,
    },
    emphasis: {
      ...plain,
      font: "syne",
      weight: 800,
      sizePct: 7.4,
      letterSpacingEm: -0.01,
      fill: { type: "gradient", from: "#FFFFFF", via: "#FFEFD6", to: "#E5B37E", angle: 180 },
      shadow: { color: "#00000080", blurEm: 0.12, offsetYEm: 0.03 },
      deepGlow: { color: "#F0C890", radiusEm: 0.3, intensity: 0.4, chromatic: null },
    },
    reveal: "word",
    upcomingOpacity: 1,
    active: null,
    animation: {
      in: "blurRise",
      inMs: 460,
      staggerMs: 0,
      out: "blur",
      outMs: 220,
      emphasis: { in: "converge", inMs: 900 },
      spring: { stiffness: 120, damping: 18, mass: 1 },
    },
  },

  // Red impact: straight, bold geometric type; the key word glows in a lit red gradient and snaps
  // in with a short red / cyan split that leaves it perfectly clean.
  impact: {
    version: 1,
    layout: "line",
    maxWordsPerPage: 5,
    maxCharsPerLine: 15,
    textCase: "none",
    position: { x: 50, y: 64 },
    maxWidthPct: 86,
    lineGapEm: -0.02,
    lineBox: null,
    base: {
      ...plain,
      font: "sora",
      weight: 800,
      sizePct: 4.8,
      letterSpacingEm: -0.03,
      fill: { type: "gradient", from: "#FFFFFF", to: "#E4E4EA", angle: 180 },
      shadow: { color: "#000000B3", blurEm: 0.22, offsetYEm: 0.04 },
    },
    emphasis: {
      ...plain,
      font: "sora",
      weight: 800,
      sizePct: 5.8,
      letterSpacingEm: -0.03,
      fill: { type: "gradient", from: "#FFC2B8", via: "#FF3B30", to: "#B0001A", angle: 180 },
      shadow: { color: "#00000099", blurEm: 0.16, offsetYEm: 0.04 },
      deepGlow: { color: "#FF2A2A", radiusEm: 0.26, intensity: 1, chromatic: null },
    },
    reveal: "word",
    upcomingOpacity: 1,
    active: null,
    animation: {
      in: "blurRise",
      inMs: 460,
      staggerMs: 0,
      out: "blur",
      outMs: 180,
      emphasis: { in: "split", inMs: 420 },
      spring: { stiffness: 300, damping: 12, mass: 0.5 },
      splitColors: ["#FF2D55", "#00E5FF"],
    },
  },
};

const GOLD: CaptionStyle = {
  // Liquid gold: a small serif sentence, then the key word in polished five-tone gold whose letters
  // rise one by one from behind a mask, a reflection running across it.
  version: 1,
  layout: "stack",
  maxWordsPerPage: 5,
  maxCharsPerLine: 22,
  textCase: "none",
  position: { x: 50, y: 64 },
  maxWidthPct: 84,
  lineGapEm: -0.08,
  lineBox: null,
  base: {
    ...plain,
    font: "dm-serif",
    weight: 400,
    sizePct: 2.8,
    fill: { type: "solid", color: "#FFFFFFEB" },
    shadow: softShadow,
  },
  emphasis: {
    ...plain,
    font: "dm-serif",
    weight: 400,
    italic: true,
    sizePct: 9.2,
    fill: {
      type: "gradient",
      from: "#FFF7D6",
      to: "#9A6B1F",
      angle: 180,
      stops: [
        { color: "#FFF7D6", atPct: 0 },
        { color: "#F5CF6B", atPct: 38 },
        { color: "#B9832B", atPct: 55 },
        { color: "#FFE7A3", atPct: 72 },
        { color: "#9A6B1F", atPct: 100 },
      ],
    },
    shadow: { color: "#0000008C", blurEm: 0.12, offsetYEm: 0.04 },
    deepGlow: { color: "#F5C452", radiusEm: 0.28, intensity: 0.35, chromatic: null },
    sweep: { color: "#FFFFFFCC", angle: 110, widthPct: 18, periodMs: 3000 },
  },
  reveal: "word",
  upcomingOpacity: 1,
  active: null,
  animation: {
    in: "blurRise",
    inMs: 460,
    staggerMs: 0,
    out: "blur",
    outMs: 220,
    emphasis: { in: "riseLetters", inMs: 720 },
  },
};

const GLASS: CaptionStyle = {
  // Frosted glass: a glass pill opens from its middle behind the key word, which then appears
  // inside it in an icy gradient.
  version: 1,
  layout: "line",
  maxWordsPerPage: 6,
  maxCharsPerLine: 20,
  textCase: "none",
  position: { x: 50, y: 66 },
  maxWidthPct: 86,
  lineGapEm: 0.12,
  lineBox: null,
  base: {
    ...plain,
    font: "outfit",
    weight: 500,
    sizePct: 3.6,
    fill: { type: "solid", color: "#FFFFFF" },
    shadow: softShadow,
  },
  emphasis: {
    ...plain,
    font: "outfit",
    weight: 700,
    sizePct: 3.9,
    fill: { type: "gradient", from: "#FFFFFF", to: "#CDE7FF", angle: 180 },
    box: {
      color: "#FFFFFF4D",
      radiusEm: 0.5,
      paddingXEm: 0.32,
      paddingYEm: 0.06,
      drawMs: 480,
      drawFrom: "center",
      glass: true,
    },
  },
  reveal: "word",
  upcomingOpacity: 1,
  active: null,
  animation: {
    in: "breathe",
    inMs: 600,
    staggerMs: 0,
    out: "blur",
    outMs: 200,
    emphasis: { in: "blurRise", inMs: 420, delayMs: 180 },
  },
};

const LIQUID: CaptionStyle = {
  // Liquid fill: the key word arrives as an outline whose letters close up, then a glowing liquid
  // rises inside it with a soft wave, following the voice.
  version: 1,
  layout: "line",
  maxWordsPerPage: 4,
  maxCharsPerLine: 14,
  textCase: "upper",
  position: { x: 50, y: 64 },
  maxWidthPct: 86,
  lineGapEm: -0.02,
  lineBox: null,
  base: {
    ...plain,
    font: "anybody",
    weight: 800,
    sizePct: 4.6,
    letterSpacingEm: -0.01,
    fill: { type: "solid", color: "#FFFFFF" },
    shadow: softShadow,
  },
  emphasis: {
    ...plain,
    font: "anybody",
    weight: 800,
    sizePct: 5.8,
    letterSpacingEm: -0.01,
    fill: { type: "solid", color: "#FFFFFF00" },
    stroke: { color: "#FFFFFFE6", widthEm: 0.03 },
    liquid: {
      fill: { type: "gradient", from: "#A8F6FF", via: "#5EE7FF", to: "#4C6FFF", angle: 180 },
      glow: "#5EE7FF99",
      minMs: 700,
    },
  },
  reveal: "word",
  upcomingOpacity: 1,
  active: null,
  animation: {
    in: "blurRise",
    inMs: 460,
    staggerMs: 0,
    out: "blur",
    outMs: 200,
    emphasis: { in: "breathe", inMs: 600 },
  },
};

export const CAPTION_PRESETS: Record<PresetId, CaptionStyle> = {
  ...FIRST_PRESETS,
  gold: GOLD,
  glass: GLASS,
  liquid: LIQUID,
};

export const DEFAULT_PRESET: PresetId = "cinema";

// Colours offered for the text and the key word (video content, like the styles).
export const TEXT_SWATCHES = ["#FFFFFF", "#F6EBD9", "#FFE8A3", "#DCEBFF", "#FFD6E0", "#111111"];
export const DEFAULT_OUTLINE_COLOR = "#000000";
export const OUTLINE_SWATCHES = ["#000000", "#FFFFFF", "#FFD43B", "#FF3B30", "#2F6BFF"];
export const ACCENT_SWATCHES = [
  "#F5C452",
  "#FF3B30",
  "#FF7A3D",
  "#FF5FA2",
  "#A78BFA",
  "#5EE7FF",
  "#34D399",
  "#FFFFFF",
];
// Reference colours for blending (lighter / deeper tones of a user colour).
export const MIX_WHITE = "#FFFFFF";
export const MIX_BLACK = "#000000";

// Neutral backdrop of the animation lab when no video is loaded (video content, like the styles).
export const LAB_BACKDROP = "linear-gradient(160deg, #23262E 0%, #101216 55%, #1B1420 100%)";

// Light that sets the mood of each style card in the gallery (its key colour, softened).
export const CARD_LIGHTS: Record<PresetId, string> = {
  cinema: "#B8C6E0",
  elegance: "#7FD4FF",
  editorial: "#FFD9A8",
  signature: "#E8B4FF",
  minimal: "#C9CED6",
  pop: "#FF9A1F",
  highlighter: "#F4D46E",
  converge: "#F0C890",
  impact: "#FF2A2A",
  gold: "#F5C452",
  glass: "#8FD3FF",
  liquid: "#5EE7FF",
};

// Studio backdrop of a style card: a soft spotlight of the style's colour from above, a faint
// counter-light below and a deep vignette, so the text reads like a lit title on a dark set.
export function cardBackdrop(light: string): string {
  const base = light.slice(0, 7);
  return [
    // hairline of light on the top edge, like the rim of a glass screen
    "linear-gradient(180deg, #FFFFFF26 0, #FFFFFF26 1px, #00000000 1px)",
    `radial-gradient(120% 75% at 50% -8%, ${base}8C 0%, ${base}33 40%, #00000000 68%)`,
    `radial-gradient(90% 55% at 50% 118%, ${base}2E 0%, #00000000 70%)`,
    "radial-gradient(140% 100% at 50% 50%, #00000000 50%, #00000099 100%)",
    "linear-gradient(180deg, #1A1C22 0%, #0C0D10 100%)",
  ].join(", ");
}

// Fine grey film grain laid over the card backdrop (removes gradient banding, adds texture).
export const CARD_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
