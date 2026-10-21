"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { MIN_TIME_STEP_MS, usePlayerBridge, type PlayerController } from "../projects/player";
import { blockKey, type StyleMoves } from "./moves";
import { blockShownAtMs, type CaptionPage } from "./paginate";
import {
  CaptionedVideo,
  type CaptionedVideoProps,
  type CaptionEditor,
} from "./remotion/captioned-video";
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
export function CaptionPlayer({
  src,
  style,
  pages,
  moves,
  editor,
}: {
  src: string;
  style: CaptionStyle;
  pages: CaptionPage[];
  // texts moved by hand, and touching / dragging them on the video
  moves?: StyleMoves;
  editor?: CaptionEditor;
}) {
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

  // touching a text pauses the video: the text stays on screen while it is moved
  const pausingEditor = useMemo<CaptionEditor | undefined>(
    () =>
      editor && {
        ...editor,
        onPick: (key, element) => {
          const current = player.current;
          current?.pause();
          // a block picked mid-animation is shown whole, so every word can be seen and moved
          const page = element === "block" ? pages.find((one) => blockKey(one) === key) : undefined;
          if (current && page) {
            current.seekTo(Math.round((blockShownAtMs(page) / 1000) * CAPTION_FPS));
          }
          editor.onPick(key, element);
        },
      },
    [editor, pages],
  );
  const inputProps = useMemo<CaptionedVideoProps>(
    () => ({ videoSrc: src, pages, style, moves, editor: pausingEditor }),
    [src, pages, style, moves, pausingEditor],
  );

  // The player draws its own buttons with English labels: they are written again in the language of
  // the page (now, and each time the player changes one, e.g. "Play" becoming "Pause").
  const t = useTranslations("captions.player");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = box.current;
    if (!root || !meta) return;
    const labels: Record<string, string> = {
      "Play video": t("play"),
      "Pause video": t("pause"),
      "Mute sound": t("mute"),
      "Unmute sound": t("unmute"),
      "Enter Fullscreen": t("enterFullscreen"),
      "Exit fullscreen": t("exitFullscreen"),
      "Change playback rate": t("rate"),
      "Change volume": t("volume"),
    };
    let working = false;
    const translate = () => {
      if (working) return;
      working = true;
      for (const element of root.querySelectorAll<HTMLElement>("[aria-label], [title]")) {
        for (const attribute of ["aria-label", "title"]) {
          const text = labels[element.getAttribute(attribute) ?? ""];
          // only when it differs: writing the same text again would wake the observer forever (English)
          if (text && text !== element.getAttribute(attribute))
            element.setAttribute(attribute, text);
        }
      }
      working = false;
    };
    translate();
    const observer = new MutationObserver(translate);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-label", "title"],
    });
    // After the full screen button, the keyboard stays on that button: Space would press it again and
    // leave the full screen. The focus is let go right after the click (the browser's full screen
    // event is not reliable for this), so that Space plays / pauses the video.
    const fullscreenLabels = [t("enterFullscreen"), t("exitFullscreen")];
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("button");
      if (button && fullscreenLabels.includes(button.getAttribute("aria-label") ?? ""))
        button.blur();
    };
    root.addEventListener("click", onClick);
    return () => {
      observer.disconnect();
      root.removeEventListener("click", onClick);
    };
  }, [meta, t]);

  if (!meta) return <Skeleton className="mx-auto aspect-[9/16] max-h-[75vh] w-full max-w-sm" />;

  return (
    <div ref={box} className="flex w-full justify-center">
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
          // --player-room: height kept for the rest of the page (more on a phone while a text is moved)
          maxWidth: `calc((100dvh - var(--player-room, 15rem)) * ${meta.width / meta.height})`,
          aspectRatio: `${meta.width} / ${meta.height}`,
        }}
      />
    </div>
  );
}
