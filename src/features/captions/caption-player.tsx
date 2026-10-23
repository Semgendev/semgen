"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { MIN_TIME_STEP_MS, usePlayerBridge, type PlayerController } from "../projects/player";
import { PlayerControls } from "./player-controls";
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

// The panels of the header (export, profile) open against the right edge of the screen, 16.25 rem
// wide. A tall (9:16) video must end before them, so that none of them falls on it: its picture
// stays centred in the card and is only made smaller, up to a small air before the panels. Its
// timeline (below) keeps the full width of the card.
const EDGE_PX = 24; // the header's side padding: the panels end there
const PANEL_PX = 260; // 16.25 rem
const AIR_PX = 20;
const MIN_VIDEO_PX = 120;
const TALL_VIDEO = 0.7; // width / height under which the video counts as tall
const TWO_COLUMNS = "(min-width: 1024px)";

// The widest picture (in px) that keeps clear of the panels, or null when it has all the room.
function useVideoClearance(box: RefObject<HTMLDivElement | null>, active: boolean): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const root = box.current;
    if (!root || !active) return;
    const measure = () => {
      if (!window.matchMedia(TWO_COLUMNS).matches) return setWidth(null);
      const rtl = getComputedStyle(root).direction === "rtl";
      const room = root.getBoundingClientRect();
      const centre = room.left + room.width / 2;
      const reserve = EDGE_PX + PANEL_PX + AIR_PX;
      // centred in the card, so twice the distance from the centre to the panels
      const half = rtl ? centre - reserve : document.documentElement.clientWidth - reserve - centre;
      const fit = Math.round(Math.max(MIN_VIDEO_PX, half * 2));
      setWidth(fit >= room.width ? null : fit);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [box, active]);
  return active ? width : null;
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
  // the player's own controls only show in full screen (the timeline below does the rest)
  const [fullscreen, setFullscreen] = useState(false);
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

  // The player sends "frameupdate" from inside its own effect: setting the time right there would be
  // a state update in an effect at every frame (React stops it with "Maximum update depth exceeded"
  // when a heavy style slows the page down). The time is published at the next screen frame instead.
  useEffect(() => {
    const current = player.current;
    if (!current || !meta) return;
    let queued: number | null = null;
    let latestMs = lastMs.current;
    const onFrame = (event: { detail: { frame: number } }) => {
      latestMs = Math.round((event.detail.frame / CAPTION_FPS) * 1000);
      if (queued !== null) return;
      queued = requestAnimationFrame(() => {
        queued = null;
        if (Math.abs(latestMs - lastMs.current) < MIN_TIME_STEP_MS) return;
        lastMs.current = latestMs;
        setTimeMs(latestMs);
      });
    };
    current.addEventListener("frameupdate", onFrame);
    return () => {
      current.removeEventListener("frameupdate", onFrame);
      if (queued !== null) cancelAnimationFrame(queued);
    };
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
  const clearance = useVideoClearance(box, meta !== null && meta.width / meta.height < TALL_VIDEO);

  useEffect(() => {
    const current = player.current;
    if (!current || !meta) return;
    const onChange = (event: { detail: { isFullscreen: boolean } }) =>
      setFullscreen(event.detail.isFullscreen);
    current.addEventListener("fullscreenchange", onChange);
    return () => current.removeEventListener("fullscreenchange", onChange);
  }, [meta]);
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

  const durationInFrames = Math.max(1, Math.ceil(meta.durationS * CAPTION_FPS));

  return (
    <div ref={box} className="flex w-full flex-col items-center gap-2">
      {/* The video picture: it may be made smaller (tall videos, see above). The timeline is not. */}
      <div
        className="w-full"
        style={{
          // height kept for the rest of the page (--player-room, more on a phone while a text is moved)
          maxWidth: `min(calc((100dvh - var(--player-room, 14.82rem)) * ${meta.width / meta.height}), ${
            clearance ? `${clearance}px` : "100%"
          })`,
        }}
      >
        <Player
          ref={player}
          component={CaptionedVideo}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          compositionWidth={meta.width}
          compositionHeight={meta.height}
          fps={CAPTION_FPS}
          controls={fullscreen}
          clickToPlay
          doubleClickToFullscreen
          allowFullscreen
          // Space/Enter are handled once for the whole page (PlayerProvider), not twice.
          spaceKeyToPlayOrPause={false}
          acknowledgeRemotionLicense
          className="overflow-hidden rounded-xl"
          style={{
            // video controls stay left to right, also on Arabic pages
            direction: "ltr",
            width: "100%",
            aspectRatio: `${meta.width} / ${meta.height}`,
          }}
        />
      </div>
      <PlayerControls
        player={player}
        durationInFrames={durationInFrames}
        fps={CAPTION_FPS}
        fullscreen={fullscreen}
      />
    </div>
  );
}
