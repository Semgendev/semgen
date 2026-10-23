"use client";

import type { PlayerRef } from "@remotion/player";
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type RefObject } from "react";

import { Button } from "@/components/ui/button";

// 0:07.35 : minutes, seconds and hundredths, like the time of a video editor.
export function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, "0")}`;
}

// The timeline under the video, as wide as the card: the video above it can be made smaller or
// larger without touching it. Play, time, sound and full screen, like the player's own controls.
export function PlayerControls({
  player,
  durationInFrames,
  fps,
  fullscreen,
}: {
  player: RefObject<PlayerRef | null>;
  durationInFrames: number;
  fps: number;
  fullscreen: boolean;
}) {
  const t = useTranslations("captions.player");
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  // The player tells what it does; the controls only show it. The frame is shown at most about
  // every 60 ms: the bar does not need all 60 images per second.
  useEffect(() => {
    const current = player.current;
    if (!current) return;
    let last = 0;
    const onFrame = (event: { detail: { frame: number } }) => {
      const now = performance.now();
      if (now - last < 60) return;
      last = now;
      setFrame(event.detail.frame);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      setFrame(current.getCurrentFrame());
    };
    const onMute = () => setMuted(current.isMuted());
    current.addEventListener("frameupdate", onFrame);
    current.addEventListener("play", onPlay);
    current.addEventListener("pause", onPause);
    current.addEventListener("ended", onPause);
    current.addEventListener("seeked", onPause);
    current.addEventListener("mutechange", onMute);
    return () => {
      current.removeEventListener("frameupdate", onFrame);
      current.removeEventListener("play", onPlay);
      current.removeEventListener("pause", onPause);
      current.removeEventListener("ended", onPause);
      current.removeEventListener("seeked", onPause);
      current.removeEventListener("mutechange", onMute);
    };
  }, [player]);

  const last = Math.max(1, durationInFrames - 1);
  const safeFrame = Math.min(frame, last);

  return (
    // the timeline reads left to right, also on Arabic pages
    <div dir="ltr" className="flex w-full shrink-0 flex-col gap-1">
      <input
        type="range"
        min={0}
        max={last}
        step={1}
        value={safeFrame}
        aria-label={t("seek")}
        onChange={(event) => {
          const next = Number(event.target.value);
          setFrame(next);
          player.current?.seekTo(next);
        }}
        className="accent-brand focus-visible:ring-focus h-6 w-full cursor-pointer rounded-full outline-none focus-visible:ring-2"
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="max-lg:size-11"
          aria-label={playing ? t("pause") : t("play")}
          title={playing ? t("pause") : t("play")}
          onClick={() => player.current?.toggle()}
        >
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </Button>
        <p className="text-text-2 text-sm tabular-nums">
          <span className="text-text font-medium">{formatClock(safeFrame / fps)}</span>
          {" / "}
          {formatClock(durationInFrames / fps)}
        </p>
        <div className="ms-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="max-lg:size-11"
            aria-label={muted ? t("unmute") : t("mute")}
            title={muted ? t("unmute") : t("mute")}
            onClick={() => {
              const current = player.current;
              if (!current) return;
              if (current.isMuted()) current.unmute();
              else current.mute();
            }}
          >
            {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="max-lg:size-11"
            aria-label={fullscreen ? t("exitFullscreen") : t("enterFullscreen")}
            title={fullscreen ? t("exitFullscreen") : t("enterFullscreen")}
            onClick={() => {
              const current = player.current;
              if (!current) return;
              if (current.isFullscreen()) current.exitFullscreen();
              else current.requestFullscreen();
            }}
          >
            {fullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
