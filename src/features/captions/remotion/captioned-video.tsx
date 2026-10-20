import {
  useMemo,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
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
  blurSamples,
  exitMs,
  fillProgress,
  layoutLines,
  letterRiseEm,
  liquidLevel,
  wordMotionAt,
  type WordMotion,
} from "../motion";
import {
  blockKey,
  ELEMENT_IDS,
  layerIndex,
  lineElements,
  placementOf,
  type ElementId,
  type Placement,
  type StyleMoves,
} from "../moves";
import { visiblePageIndices, type CaptionPage, type CaptionWord } from "../paginate";
import type { CaptionFill, CaptionStyle, TextLook } from "../style";

// The one composition used both by the in-app preview (@remotion/player) and by the final export
// (Remotion Lambda, T4.4): same code, same frames, same result.

// Moving texts by hand, in the preview only (the export never gets it): touching a text picks it,
// dragging it moves it. Offsets are in % of the frame.
export type CaptionEditor = {
  selected: { key: string; element: ElementId } | null;
  onPick: (key: string, element: ElementId) => void;
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

// Look of a text the user can touch (the picked one is framed).
function pickable(
  editor: CaptionEditor | undefined,
  key: string,
  element: ElementId | null,
): CSSProperties {
  if (!editor || !element) return {};
  const selected = editor.selected?.key === key && editor.selected.element === element;
  return {
    pointerEvents: "auto",
    cursor: selected ? "grab" : "pointer",
    touchAction: "none",
    outline: selected ? "0.12em dashed var(--color-brand)" : undefined,
    outlineOffset: selected ? "0.12em" : undefined,
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
  place,
  paint,
}: {
  text: string;
  spreadEm: number;
  // letters rising from behind a mask (1 = all in place)
  rise: number;
  place: LinePlace;
  paint?: CSSProperties;
}) {
  if (spreadEm < 0.001 && rise >= 1) return <>{text}</>;
  const letters = Array.from(graphemes.segment(text), (part) => part.segment);
  if (JOINED_SCRIPTS.test(text)) {
    const shift = (place.before + letters.length / 2 - place.middle) * spreadEm;
    return (
      <span
        style={{
          display: "inline-block",
          transform: `translate3d(${shift}em, ${letterRiseEm(rise, 0, 1)}em, 0) scaleX(${1 + spreadEm})`,
          ...paint,
        }}
      >
        {text}
      </span>
    );
  }
  return (
    <>
      {letters.map((letter, index) => (
        <span
          key={index}
          style={{
            display: "inline-block",
            transform: `translate3d(${(place.before + index - place.middle) * spreadEm}em, ${letterRiseEm(rise, index, letters.length)}em, 0)`,
            ...paint,
          }}
        >
          {letter}
        </span>
      ))}
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
  const drawn =
    drawMs > 0
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
  const text = applyCase(word.text, style.textCase);
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
        <Glyphs text={text} spreadEm={spreadEm} rise={motion.letters} place={place} paint={paint} />
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
        transform: `${shift ?? ""} translate3d(0, ${motion.translateYEm}em, 0) scale(${scale})`,
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
            transform: `translate3d(0, ${(ghost.translateYEm - motion.translateYEm) / scale}em, 0) scale(${ghost.scale / motion.scale})`,
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
        <Glyphs
          text={text}
          spreadEm={motion.spreadEm}
          rise={motion.letters}
          place={place}
          paint={mainPaint}
        />
      </span>
      {liquid && level > 0
        ? layer("liquid", {
            ...fillStyle(liquid.fill),
            clipPath: liquidClip(level, timeMs),
            filter: `drop-shadow(0 0 0.12em ${liquid.glow})`,
          })
        : null}
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
    for (const wordIndex of line) {
      const word = page.words[wordIndex];
      if (!word) continue;
      const look = word.emphasis ? style.emphasis : style.base;
      const fontPx = (look.sizePct / 100) * height;
      const font = `${look.italic && !ARABIC_TEXT.test(word.text) ? "italic " : ""}${look.weight} ${fontPx}px ${fontFamily(look)}`;
      const box = style.active?.box ?? look.box;
      // a converging word starts wider than it ends: it must fit in the zone from its first frame
      const entrance = word.emphasis
        ? (style.animation.emphasis?.in ?? style.animation.in)
        : style.animation.in;
      if (entrance === "converge") {
        lineWidth += (Array.from(word.text).length - 1) * CONVERGE_SPREAD_EM * fontPx;
      }
      lineWidth +=
        measureText(applyCase(word.text, style.textCase), font, look.letterSpacingEm * fontPx) +
        (box ? box.paddingXEm * fontPx : 0);
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
  const baseFontPx = (style.base.sizePct / 100) * height * fit.scale;
  const key = blockKey(page);
  const elements = lineElements(lines, page.words, style.layout === "stack");
  // the key word inside a line (one-line styles) moves on its own, on top of its line
  const keyWord = placementOf(moves, key, "emphasis");

  return (
    <div
      style={{
        position: "absolute",
        left: `${style.position.x}%`,
        top: fit.centerY,
        transform: "translate(-50%, -50%)",
        width: `${style.maxWidthPct}%`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: `${style.lineGapEm * baseFontPx}px`,
        textAlign: "center",
      }}
    >
      {lines.map((line, lineIndex) => {
        const lengths = line.map(
          (wordIndex) => applyCase(page.words[wordIndex]?.text ?? "", style.textCase).length,
        );
        const total = lengths.reduce((sum, length) => sum + length, 0) + line.length - 1;
        // an Arabic line is laid out from right to left: the first word is on the right
        const rtl = line.some((wordIndex) => ARABIC_TEXT.test(page.words[wordIndex]?.text ?? ""));
        let before = 0;
        const places = lengths.map((length) => {
          // place on screen, counted from the left
          const place = { before: rtl ? total - before - length : before, middle: (total - 1) / 2 };
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
        return (
          <div
            key={lineIndex}
            data-caption-element={editor && element ? `${key}|${element}` : undefined}
            // reachable with the keyboard too (Enter picks it)
            tabIndex={editor && element ? 0 : undefined}
            role={editor && element ? "button" : undefined}
            style={{
              ...pickable(editor, key, element),
              position: "relative",
              zIndex: lineLayer,
              transform: place ? shiftOf(place, width, height) : undefined,
              display: "flex",
              // lines are cut by layoutLines and sized by fitPage: the browser never wraps them
              flexWrap: "nowrap",
              direction: rtl ? "rtl" : "ltr",
              justifyContent: "center",
              alignItems: "baseline",
              columnGap: `${baseFontPx * 0.28}px`,
              backgroundColor: style.lineBox?.color,
              borderRadius: style.lineBox ? `${style.lineBox.radiusEm * baseFontPx}px` : undefined,
              padding: style.lineBox
                ? `${style.lineBox.paddingYEm * baseFontPx}px ${style.lineBox.paddingXEm * baseFontPx}px`
                : undefined,
            }}
          >
            {line.map((wordIndex, position) => {
              const word = page.words[wordIndex];
              if (!word) return null;
              const look = word.emphasis ? style.emphasis : style.base;
              const ownKeyWord = word.emphasis && element !== "emphasis";
              return (
                <Word
                  key={wordIndex}
                  shift={ownKeyWord ? shiftOf(keyWord, width, height) : undefined}
                  zIndex={ownKeyWord ? layerIndex(keyWord.layer) : 1}
                  pick={
                    ownKeyWord && editor
                      ? { id: `${key}|emphasis`, style: pickable(editor, key, "emphasis") }
                      : undefined
                  }
                  word={word}
                  look={look}
                  style={style}
                  motion={wordMotionAt(page, wordIndex, timeMs, style)}
                  trail={blurSamples(page, wordIndex, timeMs, fps, style)}
                  progress={fillProgress(page, wordIndex, timeMs)}
                  timeMs={timeMs}
                  active={activeAmount(page, wordIndex, timeMs)}
                  said={interpolate(timeMs - activeWindow(page, wordIndex).start, [0, 90], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}
                  fontPx={(look.sizePct / 100) * height * fit.scale}
                  place={places[position] ?? { before: 0, middle: 0 }}
                />
              );
            })}
          </div>
        );
      })}
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
  if (!editor) return <>{blocks}</>;

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
      // the frame itself lets clicks through to the player: only the texts can be touched
      style={{ pointerEvents: "none" }}
      onPointerDown={(event) => {
        const target = targetOf(event);
        const picked = elementOf(target);
        if (!target || !picked) return;
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
      // a touch on a text never plays / pauses the video
      onClick={(event) => {
        if (targetOf(event)) event.stopPropagation();
      }}
    >
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
