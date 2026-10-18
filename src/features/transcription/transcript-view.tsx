"use client";

import { Check, Copy, Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { usePlayerControls, usePlayerTime } from "../projects/player";
import type { Transcript } from "./queries";
import type { TranscriptWord } from "./types";
import {
  findActiveWordIndex,
  findSegmentIndex,
  formatTimestamp,
  isLowConfidence,
  toPlainText,
  toSrt,
} from "./view";

type WordButtonProps = {
  word: TranscriptWord;
  index: number;
  active: boolean;
  flagged: boolean;
  doubtLabel: string;
  onSeek: (ms: number) => void;
};

// Memoised: the active word changes ~4 times per second while hundreds of words stay untouched.
const WordButton = memo(function WordButton({
  word,
  index,
  active,
  flagged,
  doubtLabel,
  onSeek,
}: WordButtonProps) {
  return (
    <button
      type="button"
      data-word-index={index}
      title={flagged ? doubtLabel : undefined}
      aria-current={active ? "true" : undefined}
      onClick={() => onSeek(word.start)}
      className={cn(
        "focus-visible:ring-ring rounded px-0.5 transition-colors outline-none focus-visible:ring-2",
        active ? "bg-primary text-primary-foreground" : "hover:bg-accent",
        flagged &&
          !active &&
          "decoration-warning underline decoration-dotted decoration-2 underline-offset-4",
      )}
    >
      {word.text}
    </button>
  );
});

function download(fileName: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function TranscriptView({ transcript, title }: { transcript: Transcript; title: string }) {
  const t = useTranslations("transcription");
  const locale = useLocale();
  const timeMs = usePlayerTime();
  const { seek, isPlaying } = usePlayerControls();
  const [showDoubts, setShowDoubts] = useState(true);
  const [copied, setCopied] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  const { words, segments } = transcript;
  const activeWord = findActiveWordIndex(words, timeMs);
  const activeSegment = activeWord >= 0 ? findSegmentIndex(segments, activeWord) : -1;
  const doubtCount = useMemo(() => words.filter(isLowConfidence).length, [words]);

  const languageName = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "language" }).of(transcript.language);
    } catch {
      return transcript.language;
    }
  }, [locale, transcript.language]);

  // While playing, keep the current line in view inside the transcript box (not the whole page).
  useEffect(() => {
    if (activeSegment < 0 || !isPlaying()) return;
    const box = container.current;
    const line = box?.querySelector<HTMLElement>(`[data-segment-index="${activeSegment}"]`);
    if (!box || !line) return;
    const top = line.offsetTop - box.clientHeight / 3;
    box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [activeSegment, isPlaying]);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(toPlainText(segments));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked by the browser: the downloads below still work.
    }
  }

  const baseName = title.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60) || "transcript";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {t("detectedLanguage", { language: languageName ?? transcript.language })}
          {transcript.language_confidence !== null
            ? ` · ${Math.round(transcript.language_confidence * 100)} %`
            : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copyText}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? t("copied") : t("copy")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => download(`${baseName}.srt`, toSrt(segments), "application/x-subrip")}
          >
            <Download aria-hidden="true" />
            SRT
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => download(`${baseName}.txt`, toPlainText(segments), "text/plain")}
          >
            <Download aria-hidden="true" />
            TXT
          </Button>
        </div>
      </div>

      {doubtCount > 0 ? (
        <label className="text-muted-foreground flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showDoubts}
            onChange={(event) => setShowDoubts(event.target.checked)}
            className="accent-primary size-4"
          />
          {t("showDoubts", { count: doubtCount })}
        </label>
      ) : null}

      <div
        ref={container}
        className="bg-card relative flex max-h-[60vh] flex-col gap-3 overflow-y-auto rounded-xl border p-4"
      >
        {segments.map((segment, segmentIndex) => (
          <div
            key={segment.word_start}
            data-segment-index={segmentIndex}
            className="flex gap-3 leading-8"
          >
            <button
              type="button"
              onClick={() => seek(segment.start)}
              className="text-muted-foreground hover:text-foreground w-12 shrink-0 text-right text-xs tabular-nums"
              aria-label={t("jumpTo", { time: formatTimestamp(segment.start) })}
            >
              {formatTimestamp(segment.start)}
            </button>
            <p className="min-w-0 break-words">
              {words.slice(segment.word_start, segment.word_end + 1).map((word, offset) => {
                const index = segment.word_start + offset;
                return (
                  <span key={index}>
                    <WordButton
                      word={word}
                      index={index}
                      active={index === activeWord}
                      flagged={showDoubts && isLowConfidence(word)}
                      doubtLabel={t("doubtful", {
                        percent: Math.round((word.confidence ?? 0) * 100),
                      })}
                      onSeek={seek}
                    />{" "}
                  </span>
                );
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
