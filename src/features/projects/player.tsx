"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

type PlayerApi = {
  videoRef: RefObject<HTMLVideoElement | null>;
  setTimeMs: (ms: number) => void;
  // play=false moves the video without starting it (used when a word is opened for correction)
  seek: (ms: number, play?: boolean) => void;
  isPlaying: () => boolean;
  togglePlay: () => void;
};

// Keys must not hijack typing, buttons, links, dialogs or the browser's own video controls.
function isShortcutBlocked(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest('input, textarea, select, button, a, video, [role="dialog"]')) return true;
  return false;
}

// Two contexts on purpose: the API never changes, the time changes ~25 times per second.
const PlayerApiContext = createContext<PlayerApi | null>(null);
const PlayerTimeContext = createContext(0);

// Shares the project video with the transcript, so words can follow and drive the playback.
export function PlayerProvider({ children }: { children: ReactNode }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [timeMs, setTimeMs] = useState(0);
  const api = useMemo<PlayerApi>(
    () => ({
      videoRef,
      setTimeMs,
      seek: (ms, play = true) => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = ms / 1000;
        if (play) void video.play().catch(() => undefined);
        else video.pause();
      },
      isPlaying: () => {
        const video = videoRef.current;
        return Boolean(video && !video.paused && !video.ended);
      },
      togglePlay: () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused || video.ended) void video.play().catch(() => undefined);
        else video.pause();
      },
    }),
    [],
  );

  // Desktop: Enter or Space plays/pauses the video without touching the player's icon.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (isShortcutBlocked(event.target) || !videoRef.current) return;
      event.preventDefault();
      api.togglePlay();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [api]);

  return (
    <PlayerApiContext.Provider value={api}>
      <PlayerTimeContext.Provider value={timeMs}>{children}</PlayerTimeContext.Provider>
    </PlayerApiContext.Provider>
  );
}

export function usePlayerTime(): number {
  return useContext(PlayerTimeContext);
}

export function usePlayerControls() {
  const api = useContext(PlayerApiContext);
  return { seek: api?.seek ?? noop, isPlaying: api?.isPlaying ?? (() => false) };
}

function noop() {}

const MIN_TIME_STEP_MS = 40;

// The video is shown at its real size and ratio (no black bars), whatever the orientation.
export function VideoPlayer({ src, fallback }: { src: string; fallback: string }) {
  const api = useContext(PlayerApiContext);
  const frame = useRef<number | null>(null);
  const lastMs = useRef(-1);

  const publish = useCallback(() => {
    const video = api?.videoRef.current;
    if (!video || !api) return;
    const ms = Math.round(video.currentTime * 1000);
    if (Math.abs(ms - lastMs.current) >= MIN_TIME_STEP_MS || video.paused) {
      lastMs.current = ms;
      api.setTimeMs(ms);
    }
  }, [api]);

  const stopLoop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  const startLoop = useCallback(() => {
    stopLoop();
    const tick = () => {
      publish();
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [publish, stopLoop]);

  useEffect(() => stopLoop, [stopLoop]);

  return (
    <div className="flex justify-center">
      <video
        ref={api?.videoRef}
        src={src}
        controls
        playsInline
        preload="metadata"
        className="h-auto max-h-[75vh] w-auto max-w-full rounded-xl"
        onPlay={startLoop}
        onPause={() => {
          stopLoop();
          publish();
        }}
        onEnded={() => {
          stopLoop();
          publish();
        }}
        onSeeked={publish}
        onTimeUpdate={publish}
      >
        {fallback}
      </video>
    </div>
  );
}
