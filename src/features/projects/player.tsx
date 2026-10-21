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
} from "react";

// Whatever is playing the video (a plain <video>, or the Remotion player with captions) plugs in here.
export type PlayerController = {
  // play=false moves the video without starting it (used when a word is opened for correction)
  seek: (ms: number, play: boolean) => void;
  isPlaying: () => boolean;
  togglePlay: () => void;
};

type PlayerApi = {
  // plugs a player in; returns how to unplug it
  register: (controller: PlayerController) => () => void;
  setTimeMs: (ms: number) => void;
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
  const controller = useRef<PlayerController | null>(null);
  const [timeMs, setTimeMs] = useState(0);
  const api = useMemo<PlayerApi>(
    () => ({
      register: (next) => {
        controller.current = next;
        return () => {
          if (controller.current === next) controller.current = null;
        };
      },
      setTimeMs,
      seek: (ms, play = true) => controller.current?.seek(ms, play),
      isPlaying: () => controller.current?.isPlaying() ?? false,
      togglePlay: () => controller.current?.togglePlay(),
    }),
    [],
  );

  // Desktop: Enter or Space plays/pauses the video without touching the player's icon.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (isShortcutBlocked(event.target) || !controller.current) return;
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
  return {
    seek: api?.seek ?? noop,
    isPlaying: api?.isPlaying ?? (() => false),
    togglePlay: api?.togglePlay ?? noop,
  };
}

// For a player component: plug its controls in and report the current time.
export function usePlayerBridge(make: () => PlayerController) {
  const api = useContext(PlayerApiContext);
  useEffect(() => {
    if (!api) return;
    return api.register(make());
  }, [api, make]);
  return api?.setTimeMs ?? noop;
}

function noop() {}

export const MIN_TIME_STEP_MS = 40;

// The video is shown at its real size and ratio (no black bars), whatever the orientation.
export function VideoPlayer({ src, fallback }: { src: string; fallback: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frame = useRef<number | null>(null);
  const lastMs = useRef(-1);

  const makeController = useCallback(
    (): PlayerController => ({
      seek: (ms, play) => {
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
  const setTimeMs = usePlayerBridge(makeController);

  const publish = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const ms = Math.round(video.currentTime * 1000);
    if (Math.abs(ms - lastMs.current) >= MIN_TIME_STEP_MS || video.paused) {
      lastMs.current = ms;
      setTimeMs(ms);
    }
  }, [setTimeMs]);

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
        ref={videoRef}
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
