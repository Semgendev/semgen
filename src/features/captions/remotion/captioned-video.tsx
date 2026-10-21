import {
  useMemo,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  interpolateColors,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { fitScale, MAX_BLOCK_HEIGHT_PCT, measureText, safeCenterY } from "../fit";
import {
  ARABIC_TEXT,
  DEVANAGARI_TEXT,
  fontFamily,
  loadScriptFonts,
  useFontsVersion,
} from "../fonts";
import {
  ACTIVE_LEAD_MS,
  activeAmount,
  activeWindow,
  applyCase,
  CONVERGE_SPREAD_EM,
  entranceOf,
  SPREAD_START_EM,
  blurSamples,
  exitMs,
  fillProgress,
  layoutLines,
  letterRiseEm,
  letterSoftness,
  liquidLevel,
  seeded,
  wordAppearAt,
  wordMotionAt,
  type WordMotion,
} from "../motion";
import {
  blockKey,
  ELEMENT_IDS,
  isHidden,
  isSplit,
  layerIndex,
  lineElements,
  placementOf,
  type ElementId,
  type Placement,
  type StyleMoves,
} from "../moves";
import { visiblePageIndices, type CaptionPage, type CaptionWord } from "../paginate";
import { VIGNETTE_COLOR } from "../presets";
import type { CaptionFill, CaptionStyle, TextLook } from "../style";

// The one composition used both by the in-app preview (@remotion/player) and by the final export
// (Remotion Lambda, T4.4): same code, same frames, same result.

// Moving texts by hand, in the preview only (the export never gets it): touching a text picks it,
// dragging it moves it. Offsets are in % of the frame.
export type CaptionEditor = {
  selected: { key: string; element: ElementId } | null;
  onPick: (key: string, element: ElementId) => void;
  // a touch on the video away from the framed text: the selection is dropped
  onDeselect: () => void;
  // the cross on a frame: removes the block, or hides one of its two parts once it is split
  onCross: (key: string, element: ElementId) => void;
  // the "split" button on the frame of a whole block
  onSplit: (key: string) => void;
  labels: { delete: string; split: string; deleteText: string; deleteKeyWord: string };
  // dx / dy since the start of the drag; done = the finger / mouse was released
  onDrag: (key: string, element: ElementId, dx: number, dy: number, done: boolean) => void;
};

export type CaptionedVideoProps = {
  videoSrc: string | null;
  pages: CaptionPage[];
  style: CaptionStyle;
  // texts moved by hand for this style
  moves?: StyleMoves;
  editor?: CaptionEditor;
};

// Look of a text the user can touch. The cursor stays an arrow until the text is selected: only
// then it is a hand (and the text is framed), so the video keeps feeling like a video.
function pickable(
  editor: CaptionEditor | undefined,
  key: string,
  element: ElementId | null,
  height: number,
  // false while the caption is mounted but not on screen yet: it cannot be touched
  shown = true,
  // a block selected shuts the other blocks out (they may sit at the same place); the two parts
  // of a split block do not shut each other out
  exclusive = true,
): CSSProperties {
  if (!editor || !element) return {};
  const selected = editor.selected?.key === key && editor.selected.element === element;
  return {
    // while another text is selected, this one (maybe still hidden, at the same place) cannot catch
    // the touch meant for the selected one
    pointerEvents: !shown || (exclusive && editor.selected && !selected) ? "none" : "auto",
    cursor: selected ? "grab" : "default",
    touchAction: "none",
    outline: selected ? `${Math.max(2, height * 0.003)}px dashed var(--color-brand)` : undefined,
    outlineOffset: selected ? `${height * 0.008}px` : undefined,
  };
}

function shiftOf(place: Placement, width: number, height: number): string | undefined {
  if (place.x === 0 && place.y === 0) return undefined;
  return `translate(${(place.x / 100) * width}px, ${(place.y / 100) * height}px)`;
}

function fillStyle(fill: CaptionFill): CSSProperties {
  if (fill.type === "solid") return { color: fill.color };
  const stops = fill.stops
    ? fill.stops.map((stop) => `${stop.color} ${stop.atPct}%`).join(", ")
    : fill.via
      ? `${fill.from}, ${fill.via}, ${fill.to}`
      : `${fill.from}, ${fill.to}`;
  return {
    color: "transparent",
    backgroundImage: `linear-gradient(${fill.angle}deg, ${stops})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
  };
}

// Shadows and glow use drop-shadow filters: unlike text-shadow they also work on gradient text.
function filterFor(look: TextLook, motion: WordMotion): string | undefined {
  const parts: string[] = [];
  if (motion.blurEm > 0.001) parts.push(`blur(${motion.blurEm}em)`);
  if (look.glow) {
    parts.push(`drop-shadow(0 0 ${look.glow.blurEm * 0.5}em ${look.glow.color})`);
    parts.push(`drop-shadow(0 0 ${look.glow.blurEm}em ${look.glow.color})`);
  }
  if (look.shadow) {
    parts.push(
      `drop-shadow(0 ${look.shadow.offsetYEm}em ${look.shadow.blurEm}em ${look.shadow.color})`,
    );
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
}

function transparent(color: string): string {
  return `${color.slice(0, 7)}00`;
}

// Blends the normal and the highlighted fill: plain colours fade into each other, gradients switch
// at mid-point (they cannot be blended).
function mixFill(base: CaptionFill, active: CaptionFill | null, amount: number): CaptionFill {
  if (!active || amount <= 0) return base;
  if (amount >= 1) return active;
  if (base.type === "solid" && active.type === "solid") {
    return { type: "solid", color: interpolateColors(amount, [0, 1], [base.color, active.color]) };
  }
  return amount >= 0.5 ? active : base;
}

type WordProps = {
  word: CaptionWord;
  look: TextLook;
  style: CaptionStyle;
  motion: WordMotion;
  // where the word was a fraction of a frame ago (motion blur); empty when it barely moved
  trail: WordMotion[];
  // how lit the highlight is, 0 → 1
  active: number;
  // 0 = not said yet, 1 = said (fades the upcoming words in karaoke styles)
  said: number;
  // karaoke fill: share of the word already said
  progress: number;
  timeMs: number;
  fontPx: number;
  // where the word sits in its line, in characters (letters spread from the middle of the line)
  place: LinePlace;
  // moved by hand (key word of a one-line style), its stacking order, and how it can be picked
  shift?: string;
  zIndex?: number;
  pick?: { id: string; style: CSSProperties };
  // the cross shown on the frame of the key word
  badge?: ReactNode;
};

export type LinePlace = { before: number; middle: number };

// Scripts whose letters join or reorder (Arabic, Hebrew, Indic, Thai, Khmer...): never animated
// letter by letter, it would break them. They get the same effect on the whole word instead.
const JOINED_SCRIPTS = /[\u0590-\u08FF\u0900-\u0DFF\u0E00-\u0EFF\u1000-\u109F\u1780-\u17FF]/;
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

// The letters of a word, pushed apart by spreadEm from the middle of the whole line, so the line
// opens evenly and words never run into each other (fixed layout: only transforms).
// `paint` (gradient fills) is set on every letter: a gradient clipped to the text does not reach
// letters that are moved on their own.
function Glyphs({
  text,
  spreadEm,
  rise,
  soft = 1,
  place,
  paint,
}: {
  text: string;
  spreadEm: number;
  // letters rising from behind a mask (1 = all in place)
  rise: number;
  // letters coming out of a blur one after the other (1 = all sharp)
  soft?: number;
  place: LinePlace;
  paint?: CSSProperties;
}) {
  if (spreadEm < 0.001 && rise >= 1 && soft >= 1) return <>{text}</>;
  const letters = Array.from(graphemes.segment(text), (part) => part.segment);
  if (JOINED_SCRIPTS.test(text)) {
    const shift = (place.before + letters.length / 2 - place.middle) * spreadEm;
    return (
      <span
        style={{
          display: "inline-block",
          transform: `translate3d(${shift}em, ${letterRiseEm(rise, 0, 1) + (1 - soft) * 0.3}em, 0) scaleX(${1 + spreadEm})`,
          opacity: soft < 1 ? soft : undefined,
          filter: soft < 1 ? `blur(${(1 - soft) * 0.16}em)` : undefined,
          ...paint,
        }}
      >
        {text}
      </span>
    );
  }
  return (
    <>
      {letters.map((letter, index) => {
        const sharp = soft < 1 ? letterSoftness(soft, index, letters.length) : 1;
        return (
          <span
            key={index}
            style={{
              display: "inline-block",
              transform: `translate3d(${(place.before + index - place.middle) * spreadEm}em, ${letterRiseEm(rise, index, letters.length) + (1 - sharp) * 0.3}em, 0)`,
              opacity: sharp < 1 ? sharp : undefined,
              filter: sharp < 1 ? `blur(${(1 - sharp) * 0.16}em)` : undefined,
              ...paint,
            }}
          >
            {letter}
          </span>
        );
      })}
    </>
  );
}

// Fully transparent plain fill: the letters are only drawn by their outline.
function isHollow(fill: CaptionFill): boolean {
  return fill.type === "solid" && fill.color.length === 9 && fill.color.endsWith("00");
}

const PAINT_KEYS = ["color", "backgroundImage", "WebkitBackgroundClip", "backgroundClip"] as const;

// Splits a style into what paints the letters (moved onto each letter when they spread) and the rest.
function splitPaint(style: CSSProperties, spreading: boolean): [CSSProperties, CSSProperties?] {
  if (!spreading || !style.backgroundImage) return [style, undefined];
  const rest: CSSProperties = { ...style };
  const paint: CSSProperties = {};
  for (const key of PAINT_KEYS) {
    if (style[key] !== undefined) Object.assign(paint, { [key]: style[key] });
    delete rest[key];
  }
  return [rest, paint];
}

const clampOpts = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Surface of the liquid rising in a word: a gentle wave that calms down once the word is full.
function liquidClip(level: number, timeMs: number): string | undefined {
  if (level >= 0.999) return undefined;
  const surface = (1 - level) * 100;
  const amplitude = 7 * Math.sin(Math.PI * level);
  const phase = timeMs / 160;
  const points: string[] = [];
  for (let x = 0; x <= 100; x += 10) {
    const y = surface + amplitude * Math.sin((x / 100) * Math.PI * 3 + phase);
    points.push(`${x}% ${y.toFixed(2)}%`);
  }
  return `polygon(${points.join(", ")}, 100% 110%, 0% 110%)`;
}

// A box drawn behind a word when it is said: a marker stroke from the left, or a pill (plain or
// frosted glass) that opens from its middle.
function DrawnBox({
  box,
  drawn,
  rtl,
}: {
  box: NonNullable<TextLook["box"]>;
  drawn: number;
  // right-to-left word: the marker stroke starts on the right
  rtl: boolean;
}) {
  const fromCenter = box.drawFrom === "center";
  const tint = box.color.slice(0, 7);
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        inset: fromCenter ? 0 : "0.1em 0 0.02em",
        borderRadius: `${box.radiusEm}em`,
        transformOrigin: fromCenter ? "50% 50%" : rtl ? "100% 50%" : "0 50%",
        transform: `skewX(${box.skewDeg ?? 0}deg) scaleX(${fromCenter ? 0.15 + 0.85 * drawn : drawn})`,
        opacity: fromCenter ? drawn : 1,
        ...(box.glass
          ? {
              backgroundImage: `linear-gradient(180deg, ${box.color}, ${tint}14)`,
              backdropFilter: "blur(0.22em) saturate(1.3)",
              WebkitBackdropFilter: "blur(0.22em) saturate(1.3)",
              border: `0.025em solid ${tint}80`,
              boxShadow: `inset 0 0.05em 0 ${tint}99`,
            }
          : { backgroundColor: box.color }),
      }}
    />
  );
}

// A fan of light rays opening upwards from behind the word (rays look), with a slow sway.
function Rays({
  rays,
  grow,
  light,
  opacity,
  timeMs,
}: {
  rays: NonNullable<TextLook["rays"]>;
  grow: number;
  light: number;
  opacity: number;
  timeMs: number;
}) {
  const step = rays.spreadDeg / rays.count;
  const stops: string[] = [];
  for (let index = 0; index < rays.count; index++) {
    const from = index * step;
    // thin bright rays with soft edges, a little irregular so it reads as light, not as a pattern
    const width = step * (0.55 + 0.25 * Math.abs(Math.sin(index * 1.7)));
    stops.push(
      `${transparent(rays.color)} ${from}deg`,
      `${rays.color} ${from + width * 0.5}deg`,
      `${transparent(rays.color)} ${from + width}deg`,
    );
  }
  stops.push(
    `${transparent(rays.color)} ${rays.spreadDeg}deg`,
    `${transparent(rays.color)} 360deg`,
  );
  const sway = Math.sin(timeMs / 900) * 3;
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        left: "50%",
        bottom: "40%",
        width: `${rays.lengthEm * 2}em`,
        height: `${rays.lengthEm}em`,
        pointerEvents: "none",
        transformOrigin: "50% 100%",
        transform: `translateX(-50%) rotate(${sway}deg) scale(${0.35 + 0.65 * grow})`,
        backgroundImage: `conic-gradient(from ${-90 + (180 - rays.spreadDeg) / 2}deg at 50% 100%, ${stops.join(", ")})`,
        maskImage: "radial-gradient(ellipse 50% 100% at 50% 100%, black 18%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 50% 100% at 50% 100%, black 18%, transparent 100%)",
        filter: "blur(0.09em)",
        mixBlendMode: "screen",
        opacity: Math.min(1, 0.8 * light) * opacity,
      }}
    />
  );
}

// A big soft blob of coloured light behind the word, drifting slowly like a flame (haze look).
function Haze({
  haze,
  opacity,
  timeMs,
}: {
  haze: NonNullable<TextLook["haze"]>;
  opacity: number;
  timeMs: number;
}) {
  const driftX = Math.sin(timeMs / 1300) * 0.12;
  const driftY = Math.cos(timeMs / 1700) * 0.08;
  const breathe = 1 + Math.sin(timeMs / 1100) * 0.06;
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: `${haze.sizeEm * 2.6}em`,
        height: `${haze.sizeEm}em`,
        pointerEvents: "none",
        transform: `translate(-50%, -50%) translate(${driftX}em, ${driftY}em) scale(${breathe})`,
        backgroundImage: `radial-gradient(closest-side, ${haze.color} 0%, ${haze.color} 35%, ${transparent(haze.color)} 100%)`,
        filter: "blur(0.25em)",
        opacity: haze.opacity * opacity,
      }}
    />
  );
}

const INITIAL_LOCK_MS = 260;
const INITIAL_REST_AFTER_MS = 200;
const INITIAL_REST_MS = 420;

// A word spelled out from its first letter: the letter (in capitals) locks into its box, then the
// rest of the word unrolls from it. Joined scripts (Arabic, Devanagari...) keep their word whole.
export function initialOf(
  look: TextLook,
  text: string,
  startMs: number,
  timeMs: number,
): {
  box: NonNullable<TextLook["initialBox"]>;
  first: string;
  others: string;
  lock: number;
  rest: number;
} | null {
  const box = look.initialBox;
  if (!box || JOINED_SCRIPTS.test(text)) return null;
  const letters = Array.from(graphemes.segment(text), (part) => part.segment);
  const first = letters[0];
  if (!first || !/\p{L}|\p{N}/u.test(first)) return null;
  const at = startMs - ACTIVE_LEAD_MS;
  return {
    box,
    first: first.toLocaleUpperCase(),
    others: letters.slice(1).join(""),
    lock: interpolate(timeMs, [at, at + INITIAL_LOCK_MS], [0, 1], {
      ...clampOpts,
      easing: Easing.out(Easing.back(2)),
    }),
    rest: interpolate(
      timeMs,
      [at + INITIAL_REST_AFTER_MS, at + INITIAL_REST_AFTER_MS + INITIAL_REST_MS],
      [0, 1],
      { ...clampOpts, easing: Easing.out(Easing.cubic) },
    ),
  };
}

// The ring waits for the word to land before it is drawn around it.
const RING_DELAY_MS = 120;
const RING_POINTS = 56;

// A ring drawn by hand around a word (in a 100 × 100 box stretched over it): a little more than one
// turn, starting at the top left, its two ends crossing slightly apart, its edge never quite even.
// The same word always gets the same ring (preview = export). Only the part drawn so far is given
// (drawn from 0 to 1): a dashed stroke would be simpler, but browsers measure dashes wrongly on a
// stretched drawing.
export function ringPath(seed: number, drawn: number): string {
  const wobble = seeded(Math.round(seed), 3) * Math.PI * 2;
  const turn = 1.12;
  const pointAt = (t: number) => {
    const angle = Math.PI * 1.15 + t * turn * Math.PI * 2;
    // the end of the stroke closes in a little: the ends overlap without meeting
    const shrink = 1 - 0.07 * t;
    const uneven = 1 + 0.035 * Math.sin(angle * 3 + wobble);
    const x = 50 + Math.cos(angle) * 48 * shrink * uneven;
    const y = 50 + Math.sin(angle) * 46 * shrink * uneven - 3 * t;
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  };
  const end = Math.min(1, Math.max(0, drawn)) * RING_POINTS;
  const points = [`M${pointAt(0)}`];
  for (let index = 1; index <= Math.floor(end); index++)
    points.push(`L${pointAt(index / RING_POINTS)}`);
  if (end % 1 > 0) points.push(`L${pointAt(end / RING_POINTS)}`);
  return points.join(" ");
}

function Ring({
  ring,
  drawn,
  fontPx,
  seed,
}: {
  ring: NonNullable<TextLook["ring"]>;
  drawn: number;
  fontPx: number;
  seed: number;
}) {
  const path = ringPath(seed, drawn);
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        left: "-0.36em",
        top: "-0.34em",
        width: "calc(100% + 0.72em)",
        height: "calc(100% + 0.62em)",
        overflow: "visible",
        pointerEvents: "none",
        transform: "rotate(-3deg)",
      }}
    >
      <path
        d={path}
        fill="none"
        stroke={ring.color}
        strokeWidth={ring.widthEm * fontPx}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// A number counting up to its value while the word comes in: "15 000" shows 0, 2 400, 9 800...
// The text around the number ("$", "%", "K") and its way of grouping digits stay as they are.
const NUMBER_PARTS = /^(\D*?)(\d[\d\s.,\u00A0\u202F]*\d|\d)(\D*)$/;

export function countedText(text: string, progress: number): string {
  if (progress >= 1) return text;
  const match = NUMBER_PARTS.exec(text);
  if (!match) return text;
  const [, before = "", digits = "", after = ""] = match;
  const separator = /[\s,.\u00A0\u202F](?=\d{3}(?:\D|$))/.exec(digits)?.[0];
  const value = Number(digits.replace(/\D/g, ""));
  if (!Number.isFinite(value)) return text;
  const shown = String(Math.round(value * progress));
  const grouped = separator ? shown.replace(/\B(?=(\d{3})+(?!\d))/g, separator) : shown;
  return `${before}${grouped}${after}`;
}

const COUNT_MS = 700;
const EXTRUDE_STEPS = 8;

function Word({
  word,
  look,
  style,
  motion,
  trail,
  active,
  said,
  progress,
  timeMs,
  fontPx,
  place,
  shift,
  zIndex,
  pick,
  badge,
}: WordProps) {
  const highlight = style.active;
  // Arabic is read from right to left: wipes, typewriter and karaoke fill start on the right
  const rtl = ARABIC_TEXT.test(word.text);
  const fillMode = highlight?.mode === "fill";
  // The highlight box keeps the same size whether it is lit or not, so the text never moves.
  const box = highlight?.box ?? look.box;
  // Highlighter: the box is drawn like a marker stroke when the word is said, and the text takes
  // its "on the marker" colour as the stroke passes under it.
  const drawMs = !highlight?.box ? (look.box?.drawMs ?? 0) : 0;
  const typedBox = Boolean(look.cursor);
  const started = timeMs >= word.start - ACTIVE_LEAD_MS;
  const drawn = typedBox
    ? started
      ? Math.min(1, Math.max(0.18, motion.reveal + 0.12))
      : 0
    : drawMs > 0
      ? interpolate(
          timeMs,
          [word.start - ACTIVE_LEAD_MS, word.start - ACTIVE_LEAD_MS + drawMs],
          [0, 1],
          {
            ...clampOpts,
            easing: Easing.inOut(Easing.cubic),
          },
        )
      : 1;
  const boxColor = highlight?.box
    ? interpolateColors(
        active,
        [0, 1],
        [look.box?.color ?? transparent(highlight.box.color), highlight.box.color],
      )
    : drawMs > 0
      ? undefined
      : look.box?.color;
  const fill = fillMode
    ? look.fill
    : drawMs > 0
      ? mixFill(style.base.fill, look.fill, interpolate(drawn, [0.25, 0.75], [0, 1], clampOpts))
      : mixFill(look.fill, highlight?.fill ?? null, active);
  const wipeMask =
    motion.wipe < 0.999
      ? `linear-gradient(${rtl ? 270 : 90}deg, black ${motion.wipe * 125 - 25}%, transparent ${motion.wipe * 125}%)`
      : undefined;
  const scale = motion.scale * (1 + ((highlight?.scale ?? 1) - 1) * active);
  const upcoming =
    style.reveal === "page" ? interpolate(said, [0, 1], [style.upcomingOpacity, 1]) : 1;
  const hidden = 1 - motion.reveal;
  const clip =
    hidden <= 0.001
      ? undefined
      : style.animation.in === "typewriter"
        ? rtl
          ? `inset(-50% -10% -50% ${hidden * 100}%)`
          : `inset(-50% ${hidden * 100}% -50% -10%)`
        : `inset(${hidden * 100}% -10% -50% -10%)`;
  const counting = look.countUp
    ? interpolate(
        timeMs,
        [word.start - ACTIVE_LEAD_MS, word.start - ACTIVE_LEAD_MS + COUNT_MS],
        [0, 1],
        {
          ...clampOpts,
          easing: Easing.out(Easing.cubic),
        },
      )
    : 1;
  const text = countedText(applyCase(word.text, look.textCase ?? style.textCase), counting);
  const initial = initialOf(look, text, word.start, timeMs);
  const ringDrawn = look.ring
    ? interpolate(
        timeMs,
        [word.start + RING_DELAY_MS, word.start + RING_DELAY_MS + look.ring.drawMs],
        [0, 1],
        { ...clampOpts, easing: Easing.inOut(Easing.cubic) },
      )
    : 0;
  const padding = box ? `${box.paddingYEm}em ${box.paddingXEm}em` : undefined;
  // Letters rising from under the baseline stay hidden below it until they reach their place.
  const rising = motion.letters < 1;
  const riseClip = rising ? "inset(-0.6em -0.3em 0 -0.3em)" : undefined;
  // A copy of the word drawn exactly over it (same padding, same letters): glow, sweep, fill...
  const layer = (key: string, extra: CSSProperties, spreadEm = motion.spreadEm) => {
    const [rest, paint] = splitPaint(extra, spreadEm >= 0.001 || rising);
    return (
      <span
        key={key}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          padding,
          pointerEvents: "none",
          clipPath: riseClip,
          ...rest,
        }}
      >
        <Glyphs
          text={text}
          spreadEm={spreadEm}
          rise={motion.letters}
          soft={motion.soft}
          place={place}
          paint={paint}
        />
      </span>
    );
  };
  // A gradient is painted as a background clipped to the letters, and an outline drawn on the same
  // element would eat into them: its outline is a copy of the word drawn behind instead.
  const outlineBehind = Boolean(look.stroke) && fill.type === "gradient";
  const [mainStyle, mainPaint] = splitPaint(fillStyle(fill), motion.spreadEm >= 0.001 || rising);
  const liquid = look.liquid;
  const level = liquid ? liquidLevel(word, timeMs, liquid.minMs) : 0;
  const glow = look.deepGlow;
  const sweep = look.sweep;
  const sweepAt = sweep ? ((timeMs % sweep.periodMs) / sweep.periodMs) * 160 - 30 : 0;
  const splitColors = style.animation.splitColors;

  return (
    <span
      data-caption-element={pick?.id}
      tabIndex={pick ? 0 : undefined}
      role={pick ? "button" : undefined}
      style={{
        ...pick?.style,
        position: "relative",
        zIndex,
        display: "inline-block",
        fontFamily: fontFamily(look),
        fontWeight: look.weight,
        // Arabic is never slanted: a fake italic of Cairo looks broken
        fontStyle: look.italic && !rtl ? "italic" : "normal",
        fontSize: fontPx,
        letterSpacing: `${look.letterSpacingEm}em`,
        lineHeight: 1.08,
        opacity: motion.opacity * upcoming,
        transform: `${shift ?? ""} translate3d(${motion.translateXEm}em, ${motion.translateYEm}em, 0) scale(${scale})`,
        willChange: "transform, opacity",
        filter: filterFor(look, motion),
        backgroundColor: boxColor,
        borderRadius: box ? `${box.radiusEm}em` : undefined,
        padding,
        margin: box ? `0 -${box.paddingXEm * 0.5}em` : undefined,
        whiteSpace: "pre",
        maskImage: wipeMask,
        WebkitMaskImage: wipeMask,
      }}
    >
      {badge}
      {look.haze ? <Haze haze={look.haze} opacity={motion.opacity} timeMs={timeMs} /> : null}
      {look.rays ? (
        <Rays
          rays={look.rays}
          grow={motion.grow}
          light={motion.light}
          opacity={motion.opacity}
          timeMs={timeMs}
        />
      ) : null}
      {look.echo && motion.echo > 0.001
        ? Array.from({ length: look.echo.count * 2 }, (_, index) => {
            const echo = look.echo;
            if (!echo) return null;
            const rank = Math.floor(index / 2) + 1;
            const side = index % 2 === 0 ? -1 : 1;
            return layer(`echo-${index}`, {
              color: echo.color,
              transform: `translate3d(0, ${side * rank * echo.gapEm * motion.echo}em, 0)`,
              opacity: Math.min(
                1,
                motion.echo *
                  (echo.opacity ?? 1) *
                  Math.max(0.1, 0.55 - (rank - 1) * (0.42 / echo.count)),
              ),
            });
          })
        : null}
      {drawMs > 0 && look.box && drawn > 0 ? (
        <DrawnBox box={look.box} drawn={drawn} rtl={rtl} />
      ) : null}
      {glow && glow.intensity > 0 ? (
        <>
          {layer("glow-wide", {
            color: glow.color,
            filter: `blur(${glow.radiusEm * 2.2}em)`,
            opacity: Math.min(1, glow.intensity * 0.55) * motion.light,
          })}
          {layer("glow-core", {
            color: glow.color,
            filter: `blur(${glow.radiusEm}em)`,
            opacity: Math.min(1, glow.intensity * 0.9) * motion.light,
          })}
          {glow.chromatic
            ? [
                layer("chroma-left", {
                  color: glow.chromatic.left,
                  transform: `translate3d(-${glow.chromatic.offsetEm}em, 0, 0)`,
                  mixBlendMode: "screen",
                  opacity: 0.7 * motion.light,
                }),
                layer("chroma-right", {
                  color: glow.chromatic.right,
                  transform: `translate3d(${glow.chromatic.offsetEm}em, 0, 0)`,
                  mixBlendMode: "screen",
                  opacity: 0.7 * motion.light,
                }),
              ]
            : null}
        </>
      ) : null}
      {look.extrude
        ? Array.from({ length: EXTRUDE_STEPS }, (_, index) => {
            const extrude = look.extrude;
            if (!extrude) return null;
            const depth = ((EXTRUDE_STEPS - index) / EXTRUDE_STEPS) * extrude.depthEm;
            return layer(`extrude-${index}`, {
              color: extrude.color,
              transform: `translate3d(${depth * 0.6}em, ${depth}em, 0)`,
            });
          })
        : null}
      {outlineBehind && look.stroke
        ? layer("outline", {
            color: look.stroke.color,
            WebkitTextStroke: `${look.stroke.widthEm}em ${look.stroke.color}`,
          })
        : null}
      {trail.map((ghost, index) =>
        layer(
          `trail-${index}`,
          {
            ...fillStyle(fill),
            transform: `translate3d(${(ghost.translateXEm - motion.translateXEm) / scale}em, ${(ghost.translateYEm - motion.translateYEm) / scale}em, 0) scale(${ghost.scale / motion.scale})`,
            opacity: interpolate(ghost.opacity, [0, 1], [0, 0.32 - index * 0.1], clampOpts),
          },
          ghost.spreadEm,
        ),
      )}
      <span
        style={{
          position: "relative",
          ...mainStyle,
          clipPath: clip ?? riseClip,
          // The Arabic and Devanagari fonts have overlapping outlines: an outline alone would show
          // them as boxes, so hollow letters of these scripts are drawn translucent instead.
          ...(outlineBehind
            ? {}
            : look.stroke && isHollow(look.fill) && (rtl || DEVANAGARI_TEXT.test(word.text))
              ? { color: `${look.stroke.color.slice(0, 7)}59` }
              : {
                  WebkitTextStroke: look.stroke
                    ? `${look.stroke.widthEm}em ${look.stroke.color}`
                    : undefined,
                }),
          paintOrder: "stroke fill",
        }}
      >
        {initial ? (
          <>
            <span
              style={{
                display: "inline-block",
                border: `${initial.box.widthEm}em solid ${initial.box.color}`,
                borderRadius: "0.08em",
                padding: "0 0.1em",
                marginInlineEnd: "0.06em",
                color: initial.box.color,
                WebkitTextFillColor: initial.box.color,
                opacity: initial.lock,
                transform: `scale(${1.35 - 0.35 * initial.lock})`,
              }}
            >
              {initial.first}
            </span>
            <span
              style={{
                display: "inline-block",
                clipPath: `inset(-30% ${(1 - initial.rest) * 100}% -30% -5%)`,
              }}
            >
              {initial.others}
            </span>
          </>
        ) : (
          <Glyphs
            text={text}
            spreadEm={motion.spreadEm}
            rise={motion.letters}
            soft={motion.soft}
            place={place}
            paint={mainPaint}
          />
        )}
      </span>
      {look.cursor && started && motion.reveal < 0.999 ? (
        // a block cursor waits in the empty box, then rides the edge of the letters being typed
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: "14%",
            bottom: "10%",
            left: rtl
              ? `calc(${(1 - motion.reveal) * 100}% - ${(1 - motion.reveal) * 0.42}em)`
              : `calc(${motion.reveal * 100}% - ${motion.reveal * 0.42}em)`,
            width: "0.42em",
            backgroundColor: look.cursor,
          }}
        />
      ) : null}
      {liquid && level > 0
        ? layer("liquid", {
            ...fillStyle(liquid.fill),
            clipPath: liquidClip(level, timeMs),
            filter: `drop-shadow(0 0 0.12em ${liquid.glow})`,
          })
        : null}
      {look.ring && ringDrawn > 0 ? (
        <Ring ring={look.ring} drawn={ringDrawn} fontPx={fontPx} seed={word.start} />
      ) : null}
      {splitColors && motion.splitEm > 0.001
        ? splitColors.map((color, index) => {
            const side = index === 0 ? -1 : 1;
            return layer(`split-${index}`, {
              color,
              transform: `translate3d(${side * motion.splitEm}em, ${-side * motion.splitEm * 0.25}em, 0)`,
              mixBlendMode: "screen",
              opacity: interpolate(motion.splitEm, [0, 0.04], [0, 0.9], clampOpts),
            });
          })
        : null}
      {fillMode && highlight?.fill && progress > 0
        ? layer("fill", {
            ...fillStyle(highlight.fill),
            clipPath: rtl
              ? `inset(-20% -5% -20% ${(1 - progress) * 100}%)`
              : `inset(-20% ${(1 - progress) * 100}% -20% -5%)`,
          })
        : null}
      {sweep
        ? layer("sweep", {
            color: "transparent",
            backgroundImage: `linear-gradient(${sweep.angle}deg, transparent ${sweepAt - sweep.widthPct / 2}%, ${sweep.color} ${sweepAt}%, transparent ${sweepAt + sweep.widthPct / 2}%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            mixBlendMode: "screen",
            opacity: motion.light,
          })
        : null}
    </span>
  );
}

const LINE_HEIGHT = 1.08;
const WORD_GAP_EM = 0.28;

// The word of a caption drawn in the third family (poster styles): its last word, when the caption
// has three words or more and that word has some weight (4 letters at least, never "qui" or "de").
export function closingIndex(
  page: Pick<CaptionPage, "words">,
  style: Pick<CaptionStyle, "closing">,
): number {
  const last = page.words.length - 1;
  const word = page.words[last];
  if (!style.closing || last < 2 || !word || word.emphasis) return -1;
  return word.text.replace(/[^\p{L}\p{N}]/gu, "").length >= 4 ? last : -1;
}

// Whether the key word of a caption is drawn as such. Solo styles only light it up when it is alone
// on screen and carries weight (5 letters or more, not a lead-in cut by a comma like "Salut,").
export function standsOut(
  page: Pick<CaptionPage, "words">,
  wordIndex: number,
  style: Pick<CaptionStyle, "soloEmphasis">,
): boolean {
  const word = page.words[wordIndex];
  if (!word?.emphasis) return false;
  if (!style.soloEmphasis) return true;
  return (
    page.words.length === 1 &&
    !/,$/.test(word.text) &&
    word.text.replace(/[^\p{L}\p{N}]/gu, "").length >= 5
  );
}

// How much bigger the words of a line are drawn (the first line of a book-title style).
function lineScale(style: CaptionStyle, lineIndex: number, lineCount: number): number {
  return lineIndex === 0 && lineCount > 1 ? (style.firstLineScale ?? 1) : 1;
}

// The look of the key word of a caption: styles with a colour per idea give each caption one fill
// of their list (always the same one for the same caption, in the preview and the export).
function emphasisLookOf(page: CaptionPage, style: CaptionStyle): TextLook {
  const fills = style.emphasisFills;
  if (!fills || fills.length === 0) return style.emphasis;
  const fill = fills[Math.floor(seeded(style.seed ?? 7, Math.round(page.start)) * fills.length)];
  return fill ? { ...style.emphasis, fill } : style.emphasis;
}

// Size of the caption at full size, measured with its real fonts, then the scale and the position
// that keep it inside the safe zone.
function fitPage(
  page: CaptionPage,
  lines: number[][],
  style: CaptionStyle,
  width: number,
  height: number,
): { scale: number; centerY: number } {
  const baseFontPx = (style.base.sizePct / 100) * height;
  const linePad = style.lineBox ? style.lineBox.paddingXEm * baseFontPx * 2 : 0;
  let blockWidth = 0;
  let blockHeight = 0;
  lines.forEach((line, lineIndex) => {
    let lineWidth = linePad + baseFontPx * WORD_GAP_EM * (line.length - 1);
    let lineHeight = 0;
    const grow = lineScale(style, lineIndex, lines.length);
    for (const wordIndex of line) {
      const word = page.words[wordIndex];
      if (!word) continue;
      const look = standsOut(page, wordIndex, style)
        ? style.emphasis
        : style.closing && wordIndex === closingIndex(page, style)
          ? style.closing
          : style.base;
      const fontPx = (look.sizePct / 100) * height * grow;
      const font = `${look.italic && !ARABIC_TEXT.test(word.text) ? "italic " : ""}${look.weight} ${fontPx}px ${fontFamily(look)}`;
      const box = style.active?.box ?? look.box;
      // a converging word starts wider than it ends: it must fit in the zone from its first frame
      const entrance = word.emphasis
        ? (style.animation.emphasis?.in ?? entranceOf(page, style))
        : entranceOf(page, style);
      if (entrance === "converge" || entrance === "spread") {
        // a spread word starts very wide but faint and blurred: only part of it must fit at once
        const spread = entrance === "spread" ? SPREAD_START_EM * 0.35 : CONVERGE_SPREAD_EM;
        lineWidth += (Array.from(word.text).length - 1) * spread * fontPx;
      }
      lineWidth +=
        measureText(
          applyCase(word.text, look.textCase ?? style.textCase),
          font,
          look.letterSpacingEm * fontPx,
        ) +
        (box ? box.paddingXEm * fontPx : 0) +
        // the box around the first letter (its border, its padding, the gap after it)
        (look.initialBox ? 0.42 * fontPx : 0);
      lineHeight = Math.max(lineHeight, fontPx * LINE_HEIGHT);
    }
    blockWidth = Math.max(blockWidth, lineWidth);
    blockHeight += lineHeight + (lineIndex > 0 ? style.lineGapEm * baseFontPx : 0);
  });
  const scale = fitScale(
    { width: blockWidth, height: blockHeight },
    { width: (style.maxWidthPct / 100) * width, height: (MAX_BLOCK_HEIGHT_PCT / 100) * height },
  );
  return {
    scale,
    centerY: safeCenterY((style.position.y / 100) * height, blockHeight * scale, height),
  };
}

// A small round button on the corner of a framed text: the cross, or "split". Placed from the top
// right corner towards the left (slot 0, 1...). It is never part of the drag.
function Badge({
  label,
  slot,
  size,
  glyph,
  side = false,
  onActivate,
}: {
  label: string;
  slot: number;
  size: number;
  glyph: "cross" | "split";
  // beside the frame (a part of a split block) instead of on its corner (a whole block)
  side?: boolean;
  onActivate: () => void;
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      data-caption-badge=""
      aria-label={label}
      title={label}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onActivate();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        onActivate();
      }}
      style={{
        position: "absolute",
        top: side ? "50%" : -size * 0.7,
        marginTop: side ? -size / 2 : undefined,
        right: side ? -size * 1.5 : -size * 0.7 + slot * size * 1.2,
        zIndex: 6,
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        pointerEvents: "auto",
        background: "var(--color-brand)",
        color: "var(--color-on-brand)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.55}
        height={size * 0.55}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {glyph === "cross" ? (
          <path d="M6 6l12 12M18 6L6 18" />
        ) : (
          <>
            <rect x="3" y="5" width="7" height="14" rx="1.5" />
            <rect x="14" y="5" width="7" height="14" rx="1.5" />
          </>
        )}
      </svg>
    </span>
  );
}

// How much of the background of a line is drawn (0 → 1): it opens from the left as the first word
// of the line comes in, so an empty card is never seen waiting for its words.
const LINE_DRAW_MS = 260;

function lineDrawn(page: CaptionPage, line: number[], style: CaptionStyle, timeMs: number): number {
  const first = line[0];
  if (first === undefined) return 1;
  const at = wordAppearAt(page, first, style);
  return interpolate(timeMs, [at, at + LINE_DRAW_MS], [0, 1], {
    ...clampOpts,
    easing: Easing.out(Easing.cubic),
  });
}

// a caption can be touched this long after it appears
const ENTRY_GRACE_MS = 150;

function PageBlock({
  page,
  style,
  timeMs,
  width,
  height,
  fps,
  moves,
  editor,
}: {
  page: CaptionPage;
  style: CaptionStyle;
  timeMs: number;
  width: number;
  height: number;
  fps: number;
  moves: StyleMoves | undefined;
  editor: CaptionEditor | undefined;
}) {
  const lines = layoutLines(page.words, style);
  const fit = fitPage(page, lines, style, width, height);
  // left-aligned styles hang their lines from the left edge of the block
  const left = style.align === "left";
  const emphasisLook = emphasisLookOf(page, style);
  const baseFontPx = (style.base.sizePct / 100) * height * fit.scale;
  const key = blockKey(page);
  const elements = lineElements(lines, page.words, style.layout === "stack");
  // the key word inside a line (one-line styles) moves on its own, on top of its line
  const keyWord = placementOf(moves, key, "emphasis");
  // the whole block moved as one
  const blockPlace = placementOf(moves, key, "block");
  const picked = editor?.selected?.key === key ? editor.selected.element : null;
  const blockSelected = picked === "block";
  const crossPx = height * 0.045;
  // a split block shows its text and its key word as two parts that move and hide on their own
  const canSplit =
    page.words.some((word) => word.emphasis) && page.words.some((word) => !word.emphasis);
  const split = canSplit && isSplit(moves, key);
  // hidden on the video (the eye of the transcript list): the whole block, its frame and all
  const blockHidden = isHidden(moves, key);
  const textPlace = placementOf(moves, key, "text");
  // not touchable while it is still entering: it then sits, nearly invisible, over the previous one
  const live = timeMs >= page.start + ENTRY_GRACE_MS && !blockHidden;
  const firstTextLine = elements.findIndex((one) => one !== "emphasis");

  return (
    <div
      style={{
        position: "absolute",
        left: `${style.position.x}%`,
        top: fit.centerY,
        transform: "translate(-50%, -50%)",
        width: `${style.maxWidthPct}%`,
        display: "flex",
        justifyContent: left ? "flex-start" : "center",
        // only the block itself can be touched, not the empty sides around it
        pointerEvents: editor ? "none" : undefined,
        // a block being moved is shown plainly, so its frame and its badges stay readable
        mixBlendMode: picked ? undefined : style.blend,
      }}
    >
      <div
        data-caption-element={editor && !split ? `${key}|block` : undefined}
        // reachable with the keyboard too (Enter selects it)
        tabIndex={editor && !split ? 0 : undefined}
        role={editor && !split ? "button" : undefined}
        style={{
          ...(split ? {} : pickable(editor, key, "block", height, live)),
          position: "relative",
          opacity: blockHidden ? 0 : undefined,
          width: "max-content",
          maxWidth: "100%",
          transform: shiftOf(blockPlace, width, height),
          display: "flex",
          flexDirection: "column",
          alignItems: left ? "flex-start" : "center",
          gap: `${style.lineGapEm * baseFontPx}px`,
          textAlign: left ? "left" : "center",
        }}
      >
        {editor && blockSelected && !split ? (
          <>
            <Badge
              label={editor.labels.delete}
              slot={0}
              size={crossPx}
              glyph="cross"
              onActivate={() => editor.onCross(key, "block")}
            />
            {canSplit ? (
              <Badge
                label={editor.labels.split}
                slot={1}
                size={crossPx}
                glyph="split"
                onActivate={() => editor.onSplit(key)}
              />
            ) : null}
          </>
        ) : null}
        {lines.map((line, lineIndex) => {
          const grow = lineScale(style, lineIndex, lines.length);
          const lengths = line.map(
            (wordIndex) => applyCase(page.words[wordIndex]?.text ?? "", style.textCase).length,
          );
          const total = lengths.reduce((sum, length) => sum + length, 0) + line.length - 1;
          // an Arabic line is laid out from right to left: the first word is on the right
          const rtl = line.some((wordIndex) => ARABIC_TEXT.test(page.words[wordIndex]?.text ?? ""));
          let before = 0;
          const places = lengths.map((length) => {
            // place on screen, counted from the left
            const place = {
              before: rtl ? total - before - length : before,
              middle: (total - 1) / 2,
            };
            before += length + 1;
            return place;
          });
          const element = elements[lineIndex] ?? null;
          const place = element ? placementOf(moves, key, element) : null;
          const holdsKeyWord =
            element !== "emphasis" &&
            line.some((wordIndex) => page.words[wordIndex]?.emphasis === true);
          // a key word put in front / behind takes its line along (lines stack as a whole), unless
          // the line itself was given a layer
          const lineLayer =
            holdsKeyWord && keyWord.layer && !place?.layer
              ? layerIndex(keyWord.layer)
              : layerIndex(place?.layer);
          // once split: this line belongs to the text, or is the key word's own line
          const part = element === "emphasis" ? "emphasis" : "text";
          const placed =
            split && part === "text"
              ? {
                  x: (place?.x ?? 0) + textPlace.x,
                  y: (place?.y ?? 0) + textPlace.y,
                  layer: place?.layer,
                }
              : place;
          const partBadge =
            editor &&
            split &&
            picked === part &&
            (part === "emphasis" || lineIndex === firstTextLine);
          return (
            <div
              key={lineIndex}
              data-caption-element={editor && split ? `${key}|${part}` : undefined}
              tabIndex={editor && split && !blockHidden ? 0 : undefined}
              role={editor && split && !blockHidden ? "button" : undefined}
              style={{
                ...(editor && split ? pickable(editor, key, part, height, live, false) : {}),
                position: "relative",
                // the small words stay readable over the echo column of the key word
                isolation: style.lineBox ? "isolate" : undefined,
                zIndex:
                  lineLayer +
                  (element !== "emphasis" && (style.emphasis.echo || style.emphasis.rays) ? 1 : 0),
                transform: placed ? shiftOf(placed, width, height) : undefined,
                display: "flex",
                // lines are cut by layoutLines and sized by fitPage: the browser never wraps them
                flexWrap: "nowrap",
                direction: rtl ? "rtl" : "ltr",
                justifyContent: left ? "flex-start" : "center",
                alignItems: "baseline",
                columnGap: `${baseFontPx * 0.28}px`,
                padding: style.lineBox
                  ? `${style.lineBox.paddingYEm * baseFontPx}px ${style.lineBox.paddingXEm * baseFontPx}px`
                  : undefined,
              }}
            >
              {style.lineBox ? (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: -1,
                    backgroundColor: style.lineBox.color,
                    borderRadius: `${style.lineBox.radiusEm * baseFontPx}px`,
                    transformOrigin: rtl ? "100% 50%" : "0 50%",
                    transform: `scaleX(${lineDrawn(page, line, style, timeMs)})`,
                  }}
                />
              ) : null}
              {partBadge && editor ? (
                <Badge
                  label={part === "text" ? editor.labels.deleteText : editor.labels.deleteKeyWord}
                  slot={0}
                  size={crossPx}
                  glyph="cross"
                  side
                  onActivate={() => editor.onCross(key, part)}
                />
              ) : null}
              {line.map((wordIndex, position) => {
                const word = page.words[wordIndex];
                if (!word) return null;
                // solo styles only light the key word up when it is alone on screen
                const lit = standsOut(page, wordIndex, style);
                const closes = !lit && wordIndex === closingIndex(page, style);
                const look = lit
                  ? emphasisLook
                  : closes && style.closing
                    ? style.closing
                    : style.base;
                const ownKeyWord = word.emphasis && element !== "emphasis";
                return (
                  <Word
                    key={wordIndex}
                    shift={ownKeyWord ? shiftOf(keyWord, width, height) : undefined}
                    zIndex={ownKeyWord ? layerIndex(keyWord.layer) : 1}
                    pick={
                      ownKeyWord && editor && split
                        ? {
                            id: `${key}|emphasis`,
                            style: pickable(editor, key, "emphasis", height, live, false),
                          }
                        : undefined
                    }
                    badge={
                      ownKeyWord && editor && split && picked === "emphasis" ? (
                        <Badge
                          label={editor.labels.deleteKeyWord}
                          slot={0}
                          size={crossPx}
                          glyph="cross"
                          side
                          onActivate={() => editor.onCross(key, "emphasis")}
                        />
                      ) : undefined
                    }
                    word={word}
                    look={look}
                    style={style}
                    motion={wordMotionAt(page, wordIndex, timeMs, style)}
                    trail={blurSamples(page, wordIndex, timeMs, fps, style)}
                    progress={fillProgress(page, wordIndex, timeMs)}
                    timeMs={timeMs}
                    active={activeAmount(page, wordIndex, timeMs)}
                    said={interpolate(
                      timeMs - activeWindow(page, wordIndex).start,
                      [0, 90],
                      [0, 1],
                      {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      },
                    )}
                    fontPx={(look.sizePct / 100) * height * fit.scale * grow}
                    place={places[position] ?? { before: 0, middle: 0 }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// What is being dragged: the text, where the pointer started (px on screen), how far it went (%
// of the frame) and the redraw waiting for the next screen refresh.
type Drag = {
  key: string;
  element: ElementId;
  x: number;
  y: number;
  moved: boolean;
  dx: number;
  dy: number;
  frame: number | null;
};

function elementOf(target: HTMLElement | null): { key: string; element: ElementId } | null {
  const [key, element] = target?.dataset.captionElement?.split("|") ?? [];
  const known = ELEMENT_IDS.find((id) => id === element);
  return key && known ? { key, element: known } : null;
}
// below this many screen pixels, a touch is a tap (pick), not a drag
const DRAG_THRESHOLD_PX = 4;

function targetOf(event: PointerEvent | MouseEvent | KeyboardEvent): HTMLElement | null {
  return event.target instanceof Element
    ? event.target.closest<HTMLElement>("[data-caption-element]")
    : null;
}

// The current caption, plus the previous one while it is leaving: they cross over smoothly.
const VIGNETTE_IN_MS = 350;

// How dark the edges of the video are (0 to the style's vignette): they darken as the key word of a
// caption lands and come back when the caption leaves.
export function vignetteAmount(pages: CaptionPage[], style: CaptionStyle, timeMs: number): number {
  if (!style.vignette) return 0;
  const outMs = exitMs(style);
  let amount = 0;
  for (const index of visiblePageIndices(pages, timeMs, outMs)) {
    const page = pages[index];
    if (!page) continue;
    const key = page.words.find((_, wordIndex) => standsOut(page, wordIndex, style));
    if (!key) continue;
    const rise = interpolate(
      timeMs,
      [key.start - ACTIVE_LEAD_MS - 80, key.start + VIGNETTE_IN_MS],
      [0, 1],
      clampOpts,
    );
    const fall = interpolate(timeMs, [page.end, page.end + outMs + 200], [1, 0], clampOpts);
    amount = Math.max(amount, Math.min(rise, fall));
  }
  return amount * style.vignette;
}

export function CaptionLayer({
  pages,
  style,
  moves,
  editor,
}: Omit<CaptionedVideoProps, "videoSrc">) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;
  const text = useMemo(
    () => pages.flatMap((page) => page.words.map((word) => word.text)).join(" "),
    [pages],
  );
  loadScriptFonts(text);
  // re-render (and re-measure) once the fonts are really there
  useFontsVersion();
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  const blocks = visiblePageIndices(pages, timeMs, exitMs(style)).map((index) => {
    const page = pages[index];
    return page ? (
      <PageBlock
        key={index}
        page={page}
        style={style}
        timeMs={timeMs}
        width={width}
        height={height}
        fps={fps}
        moves={moves}
        editor={editor}
      />
    ) : null;
  });
  const vignette = vignetteAmount(pages, style, timeMs);
  const shade =
    vignette > 0.001 ? (
      <AbsoluteFill
        aria-hidden
        style={{
          pointerEvents: "none",
          backgroundImage: `radial-gradient(ellipse 72% 68% at 50% 50%, ${transparent(VIGNETTE_COLOR)} 38%, ${VIGNETTE_COLOR} 100%)`,
          opacity: vignette,
        }}
      />
    ) : null;
  if (!editor)
    return (
      <>
        {shade}
        {blocks}
      </>
    );

  // in % of the frame as it is shown on screen
  const delta = (event: PointerEvent, start: Drag) => {
    const rect = root.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { dx: 0, dy: 0 };
    return {
      dx: ((event.clientX - start.x) / rect.width) * 100,
      dy: ((event.clientY - start.y) / rect.height) * 100,
    };
  };

  return (
    <AbsoluteFill
      ref={root}
      // The frame lets clicks through to the player (touching the video plays / pauses it), except
      // while a block is selected: a touch away from it then only drops the selection.
      style={{ pointerEvents: editor.selected ? "auto" : "none" }}
      onPointerDown={(event) => {
        if (event.target instanceof Element && event.target.closest("[data-caption-badge]")) return;
        const target = targetOf(event);
        const picked = elementOf(target);
        if (!target || !picked) {
          // away from the framed block: the selection is dropped, and the player (which plays /
          // pauses on the press itself) never hears about this touch
          if (editor.selected) {
            event.stopPropagation();
            event.preventDefault();
            editor.onDeselect();
          }
          return;
        }
        event.stopPropagation();
        event.preventDefault();
        target.setPointerCapture(event.pointerId);
        drag.current = {
          ...picked,
          x: event.clientX,
          y: event.clientY,
          moved: false,
          dx: 0,
          dy: 0,
          frame: null,
        };
        editor.onPick(picked.key, picked.element);
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current) return;
        const far =
          Math.hypot(event.clientX - current.x, event.clientY - current.y) >= DRAG_THRESHOLD_PX;
        if (!current.moved && !far) return;
        current.moved = true;
        Object.assign(current, delta(event, current));
        // at most one redraw per screen refresh, however fast the pointer reports
        if (current.frame !== null) return;
        current.frame = requestAnimationFrame(() => {
          current.frame = null;
          editor.onDrag(current.key, current.element, current.dx, current.dy, false);
        });
      }}
      onPointerUp={(event) => {
        const current = drag.current;
        drag.current = null;
        if (!current?.moved) return;
        if (current.frame !== null) cancelAnimationFrame(current.frame);
        const { dx, dy } = delta(event, current);
        editor.onDrag(current.key, current.element, dx, dy, true);
      }}
      onPointerCancel={() => {
        const current = drag.current;
        drag.current = null;
        if (!current?.moved) return;
        if (current.frame !== null) cancelAnimationFrame(current.frame);
        // the text stays where it was last shown
        editor.onDrag(current.key, current.element, current.dx, current.dy, true);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const picked = elementOf(targetOf(event));
        if (!picked) return;
        event.preventDefault();
        event.stopPropagation();
        editor.onPick(picked.key, picked.element);
      }}
      // a touch on a text never plays / pauses the video; nor does the touch that drops the selection
      onClick={(event) => {
        if (targetOf(event)) {
          event.stopPropagation();
        } else if (editor.selected) {
          event.stopPropagation();
          editor.onDeselect();
        }
      }}
    >
      {shade}
      {blocks}
    </AbsoluteFill>
  );
}

export function CaptionedVideo({ videoSrc, pages, style, moves, editor }: CaptionedVideoProps) {
  return (
    <AbsoluteFill>
      {/* In the preview, wait for the video when it buffers instead of letting the captions run
          ahead of the sound. Ignored at export, where every frame is rendered exactly. */}
      {videoSrc ? <OffthreadVideo src={videoSrc} pauseWhenBuffering /> : null}
      <CaptionLayer pages={pages} style={style} moves={moves} editor={editor} />
    </AbsoluteFill>
  );
}
