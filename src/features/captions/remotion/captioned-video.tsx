import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  interpolate,
  interpolateColors,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { fontFamily } from "../fonts";
import {
  activeAmount,
  activeWindow,
  applyCase,
  blurSamples,
  exitMs,
  fillProgress,
  layoutLines,
  wordMotionAt,
  type WordMotion,
} from "../motion";
import { visiblePageIndices, type CaptionPage, type CaptionWord } from "../paginate";
import type { CaptionFill, CaptionStyle, TextLook } from "../style";

// The one composition used both by the in-app preview (@remotion/player) and by the final export
// (Remotion Lambda, T4.4): same code, same frames, same result.

export type CaptionedVideoProps = {
  videoSrc: string | null;
  pages: CaptionPage[];
  style: CaptionStyle;
};

function fillStyle(fill: CaptionFill): CSSProperties {
  if (fill.type === "solid") return { color: fill.color };
  return {
    color: "transparent",
    backgroundImage: `linear-gradient(${fill.angle}deg, ${fill.from}, ${fill.to})`,
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
  place,
  paint,
}: {
  text: string;
  spreadEm: number;
  place: LinePlace;
  paint?: CSSProperties;
}) {
  if (spreadEm < 0.001) return <>{text}</>;
  const letters = Array.from(graphemes.segment(text), (part) => part.segment);
  if (JOINED_SCRIPTS.test(text)) {
    const shift = (place.before + letters.length / 2 - place.middle) * spreadEm;
    return (
      <span
        style={{
          display: "inline-block",
          transform: `translate3d(${shift}em, 0, 0) scaleX(${1 + spreadEm})`,
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
            transform: `translate3d(${(place.before + index - place.middle) * spreadEm}em, 0, 0)`,
            ...paint,
          }}
        >
          {letter}
        </span>
      ))}
    </>
  );
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
}: WordProps) {
  const highlight = style.active;
  const fillMode = highlight?.mode === "fill";
  // The highlight box keeps the same size whether it is lit or not, so the text never moves.
  const box = highlight?.box ?? look.box;
  const boxColor = highlight?.box
    ? interpolateColors(
        active,
        [0, 1],
        [look.box?.color ?? transparent(highlight.box.color), highlight.box.color],
      )
    : look.box?.color;
  const fill = fillMode ? look.fill : mixFill(look.fill, highlight?.fill ?? null, active);
  const scale = motion.scale * (1 + ((highlight?.scale ?? 1) - 1) * active);
  const upcoming =
    style.reveal === "page" ? interpolate(said, [0, 1], [style.upcomingOpacity, 1]) : 1;
  const hidden = 1 - motion.reveal;
  const clip =
    hidden <= 0.001
      ? undefined
      : style.animation.in === "typewriter"
        ? `inset(-50% ${hidden * 100}% -50% -10%)`
        : `inset(${hidden * 100}% -10% -50% -10%)`;
  const text = applyCase(word.text, style.textCase);
  const padding = box ? `${box.paddingYEm}em ${box.paddingXEm}em` : undefined;
  // A copy of the word drawn exactly over it (same padding, same letters): glow, sweep, fill...
  const layer = (key: string, extra: CSSProperties, spreadEm = motion.spreadEm) => {
    const [rest, paint] = splitPaint(extra, spreadEm >= 0.001);
    return (
      <span
        key={key}
        aria-hidden
        style={{ position: "absolute", inset: 0, padding, pointerEvents: "none", ...rest }}
      >
        <Glyphs text={text} spreadEm={spreadEm} place={place} paint={paint} />
      </span>
    );
  };
  const [mainStyle, mainPaint] = splitPaint(fillStyle(fill), motion.spreadEm >= 0.001);
  const glow = look.deepGlow;
  const sweep = look.sweep;
  const sweepAt = sweep ? ((timeMs % sweep.periodMs) / sweep.periodMs) * 160 - 30 : 0;
  const splitColors = style.animation.splitColors;

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        fontFamily: fontFamily(look.font),
        fontWeight: look.weight,
        fontStyle: look.italic ? "italic" : "normal",
        fontSize: fontPx,
        letterSpacing: `${look.letterSpacingEm}em`,
        lineHeight: 1.08,
        opacity: motion.opacity * upcoming,
        transform: `translate3d(0, ${motion.translateYEm}em, 0) scale(${scale})`,
        willChange: "transform, opacity",
        filter: filterFor(look, motion),
        backgroundColor: boxColor,
        borderRadius: box ? `${box.radiusEm}em` : undefined,
        padding,
        margin: box ? `0 -${box.paddingXEm * 0.5}em` : undefined,
        whiteSpace: "pre",
      }}
    >
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
          clipPath: clip,
          WebkitTextStroke: look.stroke
            ? `${look.stroke.widthEm}em ${look.stroke.color}`
            : undefined,
          paintOrder: "stroke fill",
        }}
      >
        <Glyphs text={text} spreadEm={motion.spreadEm} place={place} paint={mainPaint} />
      </span>
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
            clipPath: `inset(-20% ${(1 - progress) * 100}% -20% -5%)`,
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

function PageBlock({
  page,
  style,
  timeMs,
  height,
  fps,
}: {
  page: CaptionPage;
  style: CaptionStyle;
  timeMs: number;
  height: number;
  fps: number;
}) {
  const lines = layoutLines(page.words, style);
  const baseFontPx = (style.base.sizePct / 100) * height;

  return (
    <div
      style={{
        position: "absolute",
        left: `${style.position.x}%`,
        top: `${style.position.y}%`,
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
        let before = 0;
        const places = lengths.map((length) => {
          const place = { before, middle: (total - 1) / 2 };
          before += length + 1;
          return place;
        });
        return (
          <div
            key={lineIndex}
            style={{
              display: "flex",
              flexWrap: "wrap",
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
              return (
                <Word
                  key={wordIndex}
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
                  fontPx={(look.sizePct / 100) * height}
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

// The current caption, plus the previous one while it is leaving: they cross over smoothly.
export function CaptionLayer({ pages, style }: Omit<CaptionedVideoProps, "videoSrc">) {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;
  return (
    <>
      {visiblePageIndices(pages, timeMs, exitMs(style)).map((index) => {
        const page = pages[index];
        return page ? (
          <PageBlock
            key={index}
            page={page}
            style={style}
            timeMs={timeMs}
            height={height}
            fps={fps}
          />
        ) : null;
      })}
    </>
  );
}

export function CaptionedVideo({ videoSrc, pages, style }: CaptionedVideoProps) {
  return (
    <AbsoluteFill>
      {/* In the preview, wait for the video when it buffers instead of letting the captions run
          ahead of the sound. Ignored at export, where every frame is rendered exactly. */}
      {videoSrc ? <OffthreadVideo src={videoSrc} pauseWhenBuffering /> : null}
      <CaptionLayer pages={pages} style={style} />
    </AbsoluteFill>
  );
}
