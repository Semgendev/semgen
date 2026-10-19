"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { Settings2 } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

import type { TranscriptWord } from "../transcription/types";
import { previewWords } from "./dev/demo-words";
import { paginate } from "./paginate";
import { CARD_GRAIN, cardBackdrop } from "./presets";
import { CaptionedVideo, type CaptionedVideoProps } from "./remotion/captioned-video";
import type { CaptionStyle } from "./style";

// The same composition as the export, at a low resolution and frame rate. The card only shows the
// middle band of the 9:16 frame, where the text is placed.
const CARD_FPS = 30;
// narrower than 9:16 so the text fills more of the small card
const CARD_WIDTH = 300;
const CARD_HEIGHT = 640;
// The demo text follows the interface language; each language is computed once.
const previews = new Map<string, { words: TranscriptWord[]; durationInFrames: number }>();
function previewFor(locale: string) {
  let preview = previews.get(locale);
  if (!preview) {
    const words = previewWords(locale);
    preview = {
      words,
      durationInFrames: Math.ceil((((words.at(-1)?.end ?? 0) + 700) / 1000) * CARD_FPS),
    };
    previews.set(locale, preview);
  }
  return preview;
}
// Still image shown while a card is at rest: a moment where the caption is fully on screen.
const POSTER_FRAME = Math.round(1.4 * CARD_FPS);

const noopSubscribe = () => () => undefined;

// A style's captions on a lit studio backdrop. It animates in a loop only while `playing`; at rest
// it shows a still frame, so the gallery stays calm and light until the pointer reaches a card.
export function StyleStage({
  style,
  light,
  playing,
  resume = false,
  className,
}: {
  style: CaptionStyle;
  light: string;
  playing: boolean;
  // pause where it stands and continue from there, instead of going back to the still frame
  resume?: boolean;
  className?: string;
}) {
  const locale = useLocale();
  const { words, durationInFrames } = previewFor(locale);
  const player = useRef<PlayerRef>(null);
  // true once the player has started once: the very first start continues from the still frame
  const started = useRef(false);
  // The Player only exists in the browser: it mounts right after hydration (server and client HTML match).
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const inputProps = useMemo<CaptionedVideoProps>(() => {
    const centered = { ...style, position: { ...style.position, y: 50 } };
    return { videoSrc: null, pages: paginate(words, centered), style: centered };
  }, [style, words]);

  useEffect(() => {
    const current = player.current;
    if (!current) return;
    if (playing) {
      // the first start (a chosen style on page load) continues from the still frame, where the
      // text is already visible; later starts (pointer entering) replay the entrance from 0
      if (!resume && started.current) current.seekTo(0);
      started.current = true;
      current.play();
    } else {
      current.pause();
      if (!resume) current.seekTo(POSTER_FRAME);
    }
  }, [playing, resume, mounted]);

  return (
    <span
      aria-hidden="true"
      className={cn("relative block aspect-[16/10] w-full overflow-hidden", className)}
      style={{ background: cardBackdrop(light) }}
    >
      <span
        className="absolute inset-x-0 top-1/2 block -translate-y-1/2"
        style={{ aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}` }}
      >
        {mounted ? (
          <Player
            ref={player}
            component={CaptionedVideo}
            inputProps={inputProps}
            durationInFrames={durationInFrames}
            compositionWidth={CARD_WIDTH}
            compositionHeight={CARD_HEIGHT}
            fps={CARD_FPS}
            initialFrame={POSTER_FRAME}
            loop
            numberOfSharedAudioTags={0}
            controls={false}
            clickToPlay={false}
            acknowledgeRemotionLicense
            style={{ width: "100%", height: "100%" }}
          />
        ) : null}
      </span>
      {/* film grain: removes gradient banding and gives the set a texture */}
      <span
        className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{ backgroundImage: CARD_GRAIN }}
      />
    </span>
  );
}

// One style of the gallery: it loops while it is the chosen one, the others only while the pointer
// (or the keyboard focus) is on them. Its name and a radio mark are below. The chosen card also shows a settings button.
export function StyleCard({
  style,
  name,
  light,
  selected,
  settingsLabel,
  onSelect,
  onOpenSettings,
}: {
  style: CaptionStyle;
  name: string;
  light: string;
  selected: boolean;
  settingsLabel: string;
  onSelect: () => void;
  onOpenSettings: () => void;
}) {
  const [active, setActive] = useState(false);

  return (
    <div
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      className={cn(
        "group bg-surface-2 relative flex w-full flex-col overflow-hidden rounded-2xl border",
        "transition-[transform,border-color,box-shadow] duration-300 ease-out",
        selected
          ? "border-brand shadow-[0_0_0_1px_var(--brand),0_10px_30px_-8px_var(--brand)]"
          : "border-border hover:border-brand-border focus-within:border-brand-border hover:-translate-y-0.5 hover:shadow-lg",
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className="focus-visible:ring-focus flex w-full flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-inset"
      >
        {/* decorative preview: screen readers get the style name, not the moving demo text */}
        <StyleStage style={style} light={light} playing={active || selected} />
        <span className="border-border flex items-center justify-between gap-2 border-t px-3 py-2.5">
          <span
            className={cn(
              "truncate text-sm font-medium transition-colors",
              selected ? "text-text" : "text-text-2 group-hover:text-text",
            )}
          >
            {name}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              selected ? "border-brand" : "border-border-strong",
            )}
          >
            <span
              className={cn(
                "bg-brand size-2 rounded-full transition-transform duration-300 ease-out",
                selected ? "scale-100" : "scale-0",
              )}
            />
          </span>
        </span>
      </button>
      {selected ? (
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label={settingsLabel}
          title={settingsLabel}
          className="bg-brand text-on-brand focus-visible:ring-focus absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full shadow-md transition-transform outline-none hover:scale-110 focus-visible:ring-2"
        >
          <Settings2 className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
