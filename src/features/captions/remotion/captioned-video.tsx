import type { CSSProperties } from "react";
import { AbsoluteFill, OffthreadVideo, useCurrentFrame, useVideoConfig } from "remotion";

import { fontFamily } from "../fonts";
import {
  activeWindow,
  applyCase,
  isActiveWord,
  layoutLines,
  wordMotionAt,
  type WordMotion,
} from "../motion";
import { findPageIndex, type CaptionPage, type CaptionWord } from "../paginate";
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

type WordProps = {
  word: CaptionWord;
  look: TextLook;
  style: CaptionStyle;
  motion: WordMotion;
  spoken: boolean;
  upcoming: boolean;
  fontPx: number;
};

function Word({ word, look, style, motion, spoken, upcoming, fontPx }: WordProps) {
  const active = spoken ? style.active : null;
  const box = active?.box ?? look.box;
  const fill = active?.fill ?? look.fill;
  const hidden = 1 - motion.reveal;
  const clip =
    hidden <= 0.001
      ? undefined
      : style.animation.in === "typewriter"
        ? `inset(-50% ${hidden * 100}% -50% -10%)`
        : `inset(${hidden * 100}% -10% -50% -10%)`;

  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: fontFamily(look.font),
        fontWeight: look.weight,
        fontStyle: look.italic ? "italic" : "normal",
        fontSize: fontPx,
        letterSpacing: `${look.letterSpacingEm}em`,
        lineHeight: 1.08,
        opacity: motion.opacity * (upcoming ? style.upcomingOpacity : 1),
        transform: `translateY(${motion.translateYEm}em) scale(${motion.scale * (active?.scale ?? 1)})`,
        filter: filterFor(look, motion),
        backgroundColor: box?.color,
        borderRadius: box ? `${box.radiusEm}em` : undefined,
        padding: box ? `${box.paddingYEm}em ${box.paddingXEm}em` : undefined,
        margin: box ? `0 -${box.paddingXEm * 0.5}em` : undefined,
        whiteSpace: "pre",
      }}
    >
      <span
        style={{
          ...fillStyle(fill),
          clipPath: clip,
          WebkitTextStroke: look.stroke
            ? `${look.stroke.widthEm}em ${look.stroke.color}`
            : undefined,
          paintOrder: "stroke fill",
        }}
      >
        {applyCase(word.text, style.textCase)}
      </span>
    </span>
  );
}

export function CaptionLayer({ pages, style }: Omit<CaptionedVideoProps, "videoSrc">) {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;
  const page = pages[findPageIndex(pages, timeMs)];
  if (!page) return null;

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
      {lines.map((line, lineIndex) => (
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
          {line.map((wordIndex) => {
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
                spoken={isActiveWord(page, wordIndex, timeMs)}
                upcoming={
                  style.reveal === "page" && timeMs < activeWindow(page, wordIndex).start
                }
                fontPx={(look.sizePct / 100) * height}
              />
            );
          })}
        </div>
      ))}
    </div>
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
