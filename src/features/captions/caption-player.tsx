"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { MIN_TIME_STEP_MS, usePlayerBridge, type PlayerController } from "../projects/player";
import { useCaptionWords } from "./caption-words";
import { paginate } from "./paginate";
import { CaptionedVideo, type CaptionedVideoProps } from "./remotion/captioned-video";
import type { CaptionStyle } from "./style";

// 60 images per second in the preview: half the steps between two frames, so motion looks smooth.
export const CAPTION_FPS = 60;

type VideoMeta = { width: number; height: number; durationS: number };

// Reads the real size and length of the video (the composition must match them exactly).
function useVideoMeta(src: string): VideoMeta | null {
  const [meta, setMeta] = useState<{ src: string; value: VideoMeta } | null>(null);
  useEffect(() => {
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.muted = true;
    probe.src = src;
    const onReady = () => {
      if (probe.videoWidth > 0 && Number.isFinite(probe.duration)) {
        setMeta({
          src,
          value: { width: probe.videoWidth, height: probe.videoHeight, durationS: probe.duration },
        });
      }
    };
    probe.addEventListener("loadedmetadata", onReady);
    return () => {
      probe.removeEventListener("loadedmetadata", onReady);
      probe.removeAttribute("src");
      probe.load();
    };
  }, [src]);
  return meta?.src === src ? meta.value : null;
}

// The project video with its animated captions (same composition as the export), kept in sync with
// the transcript: clicking a word moves this player, and playing it highlights the words.
export function CaptionPlayer({ src, style }: { src: string; style: CaptionStyle }) {
  const words = useCaptionWords();
  const pages = useMemo(() => paginate(words, style), [words, style]);
  const meta = useVideoMeta(src);
  const player = useRef<PlayerRef>(null);
  const lastMs = useRef(-1);

  const makeController = useCallback(
    (): PlayerController => ({
      seek: (ms, play) => {
        const current = player.current;
        if (!current) return;
        current.seekTo(Math.round((ms / 1000) * CAPTION_FPS));
        if (play) current.play();
        else current.pause();
      },
      isPlaying: () => player.current?.isPlaying() ?? false,
      togglePlay: () => player.current?.toggle(),
    }),
    [],
  );
  const setTimeMs = usePlayerBridge(makeController);

  useEffect(() => {
    const current = player.current;
    if (!current || !meta) return;
    const onFrame = (event: { detail: { frame: number } }) => {
      const ms = Math.round((event.detail.frame / CAPTION_FPS) * 1000);
      if (Math.abs(ms - lastMs.current) < MIN_TIME_STEP_MS) return;
      lastMs.current = ms;
      setTimeMs(ms);
    };
    current.addEventListener("frameupdate", onFrame);
    return () => current.removeEventListener("frameupdate", onFrame);
  }, [meta, setTimeMs]);

  const inputProps = useMemo<CaptionedVideoProps>(
    () => ({ videoSrc: src, pages, style }),
    [src, pages, style],
  );

  if (!meta) return <Skeleton className="mx-auto aspect-[9/16] max-h-[75vh] w-full max-w-sm" />;

  return (
    <div className="flex w-full justify-center">
      <Player
        ref={player}
        component={CaptionedVideo}
        inputProps={inputProps}
        durationInFrames={Math.max(1, Math.ceil(meta.durationS * CAPTION_FPS))}
        compositionWidth={meta.width}
        compositionHeight={meta.height}
        fps={CAPTION_FPS}
        controls
        clickToPlay
        doubleClickToFullscreen
        allowFullscreen
        // Space/Enter are handled once for the whole page (PlayerProvider), not twice.
        spaceKeyToPlayOrPause={false}
        acknowledgeRemotionLicense
        className="overflow-hidden rounded-xl"
        style={{
          // video controls and timeline stay left to right, also on Arabic pages
          direction: "ltr",
          width: "100%",
          maxWidth: `calc((100dvh - 12rem) * ${meta.width / meta.height})`,
          aspectRatio: `${meta.width} / ${meta.height}`,
        }}
      />
    </div>
  );
}
