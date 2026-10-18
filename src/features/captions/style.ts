import { z } from "zod";

// Caption styles are video content: their colours are fixed values that never follow the app palette
// (docs/DESIGN.md §3). Every size is relative to the video so a style looks the same in every format.

export const FONT_IDS = ["anton", "bebas", "montserrat", "playfair", "poppins"] as const;
export type FontId = (typeof FONT_IDS)[number];

const colorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "6 or 8 digit hex");

const fillSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("solid"), color: colorSchema }),
  z.object({
    type: z.literal("gradient"),
    from: colorSchema,
    to: colorSchema,
    // degrees, CSS convention (180 = top to bottom)
    angle: z.number().min(0).max(360),
  }),
]);
export type CaptionFill = z.infer<typeof fillSchema>;

// Sizes in "em" are relative to the font size of the text they apply to.
const shadowSchema = z.object({
  color: colorSchema,
  blurEm: z.number().min(0).max(1),
  offsetYEm: z.number().min(-0.5).max(0.5),
});

const boxSchema = z.object({
  color: colorSchema,
  radiusEm: z.number().min(0).max(1),
  paddingXEm: z.number().min(0).max(1),
  paddingYEm: z.number().min(0).max(1),
});

export const textLookSchema = z.object({
  font: z.enum(FONT_IDS),
  weight: z.union([
    z.literal(400),
    z.literal(500),
    z.literal(600),
    z.literal(700),
    z.literal(800),
    z.literal(900),
  ]),
  italic: z.boolean(),
  // font size as a percentage of the video height (5 = 5 %)
  sizePct: z.number().min(1).max(20),
  letterSpacingEm: z.number().min(-0.1).max(0.5),
  fill: fillSchema,
  stroke: z.object({ color: colorSchema, widthEm: z.number().min(0).max(0.2) }).nullable(),
  shadow: shadowSchema.nullable(),
  glow: z.object({ color: colorSchema, blurEm: z.number().min(0).max(1) }).nullable(),
  box: boxSchema.nullable(),
});
export type TextLook = z.infer<typeof textLookSchema>;

export const ANIMATIONS_IN = ["none", "fade", "pop", "rise", "blur", "typewriter", "mask"] as const;
export const ANIMATIONS_OUT = ["none", "fade", "sink", "blur"] as const;
export type AnimationIn = (typeof ANIMATIONS_IN)[number];
export type AnimationOut = (typeof ANIMATIONS_OUT)[number];

export const captionStyleSchema = z.object({
  version: z.literal(1),
  // "line": words flow on one or two lines. "stack": the key word alone on a big line, the other
  // words small above / below it (kinetic typography).
  layout: z.enum(["line", "stack"]),
  maxWordsPerPage: z.number().int().min(1).max(12),
  maxCharsPerLine: z.number().int().min(6).max(60),
  textCase: z.enum(["none", "upper", "lower"]),
  // centre of the caption block, in % of the frame
  position: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }),
  // max width of the block, in % of the frame width
  maxWidthPct: z.number().min(30).max(100),
  lineGapEm: z.number().min(-0.4).max(1),
  // background behind each line (TV-subtitle look); null = none
  lineBox: boxSchema.nullable(),
  base: textLookSchema,
  // the key word of each caption (bigger, other font, other colour...)
  emphasis: textLookSchema,
  // "word": each word appears when it is spoken. "page": the whole caption appears at once.
  reveal: z.enum(["word", "page"]),
  // opacity of words not spoken yet when reveal = "page" (karaoke look); 1 = no difference
  upcomingOpacity: z.number().min(0).max(1),
  // look of the word being spoken right now (karaoke highlight); null = no highlight
  active: z
    .object({
      fill: fillSchema.nullable(),
      box: boxSchema.nullable(),
      scale: z.number().min(1).max(1.5),
    })
    .nullable(),
  animation: z.object({
    in: z.enum(ANIMATIONS_IN),
    inMs: z.number().int().min(0).max(1500),
    // delay between two words when they appear together (reveal = "page")
    staggerMs: z.number().int().min(0).max(400),
    out: z.enum(ANIMATIONS_OUT),
    outMs: z.number().int().min(0).max(1000),
  }),
});
export type CaptionStyle = z.infer<typeof captionStyleSchema>;
