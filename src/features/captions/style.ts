import { z } from "zod";

// Caption styles are video content: their colours are fixed values that never follow the app palette
// (docs/DESIGN.md §3). Every size is relative to the video so a style looks the same in every format.

export const FONT_IDS = [
  "anton",
  "bebas",
  "montserrat",
  "playfair",
  "poppins",
  "instrument",
  "inter-tight",
  "pinyon",
  "manrope",
  "bricolage",
  "fraunces",
  "syne",
  "sora",
  "dm-serif",
  "outfit",
  "anybody",
  "inter",
  "figtree",
  "newsreader",
  "bodoni",
  "great-vibes",
] as const;
export type FontId = (typeof FONT_IDS)[number];

const colorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "6 or 8 digit hex");

const fillSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("solid"), color: colorSchema }),
  z.object({
    type: z.literal("gradient"),
    from: colorSchema,
    // optional middle colour: a bright band in the middle makes the gradient look lit
    via: colorSchema.optional(),
    to: colorSchema,
    // degrees, CSS convention (180 = top to bottom)
    angle: z.number().min(0).max(360),
    // polished metal needs more tones: when set, these stops replace from / via / to
    stops: z
      .array(z.object({ color: colorSchema, atPct: z.number().min(0).max(100) }))
      .min(2)
      .max(8)
      .optional(),
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
  // highlighter: the box is drawn from left to right in drawMs when the word is said (0 = always
  // there), slanted by skewDeg like a marker stroke
  drawMs: z.number().int().min(0).max(1500).optional(),
  skewDeg: z.number().min(-20).max(20).optional(),
  // left = a marker stroke, centre = a pill that opens from its middle
  drawFrom: z.enum(["left", "center"]).optional(),
  // frosted glass: blurs the video behind it, with a light edge and a soft sheen
  glass: z.boolean().optional(),
});

// "Deep glow": a wide, soft halo of light behind the text, with an optional colour fringe
// (chromatic aberration) like a camera lens.
const deepGlowSchema = z.object({
  color: colorSchema,
  radiusEm: z.number().min(0).max(2),
  // 0 = off, 1 = normal, 2 = very bright
  intensity: z.number().min(0).max(2),
  chromatic: z
    .object({ left: colorSchema, right: colorSchema, offsetEm: z.number().min(0).max(0.2) })
    .nullable(),
});

// "Light sweep": a band of light crossing the letters, like a reflection on metal or glass.
const sweepSchema = z.object({
  color: colorSchema,
  angle: z.number().min(0).max(360),
  // width of the band, in % of the word
  widthPct: z.number().min(5).max(80),
  // one pass every periodMs
  periodMs: z.number().int().min(600).max(10000),
});

// "Rays": a fan of light opening upwards behind the word when it lands, like a spotlight.
const raysSchema = z.object({
  color: colorSchema,
  count: z.number().int().min(3).max(24),
  // opening of the fan, in degrees
  spreadDeg: z.number().min(20).max(180),
  // length of the rays, in em of the word
  lengthEm: z.number().min(0.5).max(6),
});

// "Echo": copies of the word stacked in a column above and below it, that unroll when the word
// lands and fold back into it.
const echoSchema = z.object({
  color: colorSchema,
  // copies on each side
  count: z.number().int().min(1).max(8),
  // distance between two copies, in em (under 1 em the copies overlap a little)
  gapEm: z.number().min(0.3).max(1.4),
  // how visible the copies are, 1 = as designed (the user's setting)
  opacity: z.number().min(0).max(2).optional(),
});

// "Haze": a big soft blob of coloured light behind the word that drifts slowly, like fire.
const hazeSchema = z.object({
  color: colorSchema,
  // size of the blob, in em of the word
  sizeEm: z.number().min(0.5).max(5),
  opacity: z.number().min(0).max(1),
});

export const textLookSchema = z.object({
  font: z.enum(FONT_IDS),
  weight: z.union([
    z.literal(300),
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
  deepGlow: deepGlowSchema.nullable().optional(),
  sweep: sweepSchema.nullable().optional(),
  // a glowing liquid rises inside the word, from bottom to top, while it is said
  liquid: z
    .object({ fill: fillSchema, glow: colorSchema, minMs: z.number().int().min(100).max(3000) })
    .nullable()
    .optional(),
  rays: raysSchema.nullable().optional(),
  echo: echoSchema.nullable().optional(),
  haze: hazeSchema.nullable().optional(),
  // a block cursor at the edge of the letters being typed (a word written in a black box)
  cursor: colorSchema.nullable().optional(),
  // a solid block of the word behind it, going down and to the right (a 3D number)
  extrude: z
    .object({ color: colorSchema, depthEm: z.number().min(0).max(0.3) })
    .nullable()
    .optional(),
  // a number counts up to its value while the word comes in ("0 → 15 000")
  countUp: z.boolean().optional(),
});
export type TextLook = z.infer<typeof textLookSchema>;

// track = letters close in (spacing that opens then settles), flicker = neon that sputters on,
// split = red / green / blue copies that come together (chromatic split), blurRise = comes out of
// focus while rising a little, ink = written from left to right with a soft edge, converge = letters
// far apart and blurred that gather from the centre, breathe = letters that gently close up.
export const ANIMATIONS_IN = [
  "none",
  "fade",
  "pop",
  "rise",
  "blur",
  "typewriter",
  "mask",
  "track",
  "flicker",
  "split",
  "blurRise",
  "ink",
  "converge",
  "breathe",
  "riseLetters",
  // slam = lands big with a flash of light (the glow and the rays burst then calm down), echo = its
  // copies unroll in a column then fold back, whip = shoots in from the side out of focus, focus =
  // comes out of a soft blur while it zooms back to its size
  "slam",
  "echo",
  "whip",
  "focus",
  // fly = each small word comes from its own side (left, right, below) out of a blur; drift = the
  // letters come out of a blur one after the other, rising softly (a whisper)
  "fly",
  "drift",
  // rack = a camera pulling focus: the word comes out of a deep blur, growing from 90 %; spread =
  // the letters start very far apart and close in while they come into focus
  "rack",
  "spread",
] as const;
export const ANIMATIONS_OUT = ["none", "fade", "sink", "blur"] as const;
export type AnimationIn = (typeof ANIMATIONS_IN)[number];
export type AnimationOut = (typeof ANIMATIONS_OUT)[number];

export const captionStyleSchema = z.object({
  version: z.literal(1),
  // "line": words flow on one or two lines. "stack": the key word alone on a big line, the other
  // words small above / below it (kinetic typography).
  layout: z.enum(["line", "stack"]),
  // where the lines sit in the block; centred when absent
  align: z.enum(["center", "left"]).optional(),
  // which word is the key word of a caption: the one that matters most (absent), always the first
  // one (a big opening word with the rest of the sentence small below it), the number it holds, or
  // never the last one (a poster: the last word takes the third family)
  keyWord: z.enum(["first", "number", "notLast"]).optional(),
  // How the text is cut into captions (every style must choose; the video, the transcript tab and the
  // exports all show the same captions). "sentence": a whole sentence per caption, a very long one is
  // still cut where the sentence allows it. "phrase": short pieces ("Salut, j'espère" / "que tu vas
  // bien"), cut at the word / character limits below.
  grouping: z.enum(["sentence", "phrase"]),
  maxWordsPerPage: z.number().int().min(1).max(12),
  maxCharsPerLine: z.number().int().min(6).max(60),
  textCase: z.enum(["none", "upper", "lower"]),
  // centre of the caption block, in % of the frame
  position: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }),
  // max width of the block, in % of the frame width
  maxWidthPct: z.number().min(30).max(100),
  lineGapEm: z.number().min(-0.8).max(1),
  // background behind each line (TV-subtitle look); null = none
  lineBox: boxSchema.nullable(),
  base: textLookSchema,
  // the key word of each caption (bigger, other font, other colour...)
  emphasis: textLookSchema,
  // a third family for the last word of a caption of three words or more (a poster: fine italic,
  // huge italic, heavy sans)
  closing: textLookSchema.optional(),
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
      // switch = the word lights up; fill = the colour fills it from left to right as it is said
      mode: z.enum(["switch", "fill"]).optional(),
    })
    .nullable(),
  animation: z.object({
    in: z.enum(ANIMATIONS_IN),
    inMs: z.number().int().min(0).max(1500),
    // delay between two words when they appear together (reveal = "page")
    staggerMs: z.number().int().min(0).max(400),
    out: z.enum(ANIMATIONS_OUT),
    outMs: z.number().int().min(0).max(1000),
    // spring of the entrance (pop / track / split); defaults per animation when absent
    spring: z
      .object({
        stiffness: z.number().min(10).max(1000),
        damping: z.number().min(1).max(100),
        mass: z.number().min(0.1).max(5),
      })
      .optional(),
    // motion blur on fast movements (180° shutter, like a film camera)
    motionBlur: z.boolean().optional(),
    // colours of the two outer copies of the "split" entrance
    splitColors: z.tuple([colorSchema, colorSchema]).optional(),
    // each caption takes one of these entrances (always the same one for the same caption): one
    // family of motion, a different move from one caption to the next
    variants: z.array(z.enum(ANIMATIONS_IN)).min(2).max(8).optional(),
    // the key word may have its own entrance (letters that converge while the rest fades in...)
    emphasis: z
      .object({
        in: z.enum(ANIMATIONS_IN),
        inMs: z.number().int().min(0).max(1500),
        // waits a little (e.g. for its glass pill to open)
        delayMs: z.number().int().min(0).max(1000).optional(),
      })
      .optional(),
  }),
  // the key word of each caption takes one of these fills in turn (a colour per idea); the user's
  // own key word colour replaces them
  emphasisFills: z.array(fillSchema).min(2).max(8).optional(),
  // a word alone stays alone (rapid styles: one or two words at a time), instead of being glued to
  // its neighbour
  singleWords: z.boolean().optional(),
  // the key word only stands out when it is alone on screen (a caption of one word)
  soloEmphasis: z.boolean().optional(),
  // the first line of a caption is drawn this much bigger than the others (book titles)
  firstLineScale: z.number().min(1).max(2).optional(),
  // makes every "random" detail (neon flicker...) identical in the preview and the export
  seed: z.number().int().optional(),
});
export type CaptionStyle = z.infer<typeof captionStyleSchema>;
