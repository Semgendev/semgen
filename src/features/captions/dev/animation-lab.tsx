"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { ChevronLeft, ChevronRight, Pause, Play, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CAPTION_FPS } from "../caption-player";
import { SPRINGS } from "../motion";
import { paginate } from "../paginate";
import {
  CAPTION_PRESETS,
  LAB_BACKDROP,
  PRESET_IDS,
  PROTOTYPE_IDS,
  PROTOTYPE_PRESETS,
} from "../presets";
import { CaptionedVideo, type CaptionedVideoProps } from "../remotion/captioned-video";
import type { CaptionStyle } from "../style";
import { demoWords } from "./demo-words";

// Internal animation lab (not translated on purpose, like /dev/themes): every style on the same
// text, in slow motion or frame by frame, with live settings. Used to tune the "feeling".

const LABELS: Record<string, string> = {
  spring: "A1 · Pop à ressort",
  fill: "B5 · Remplissage karaoké",
  tracking: "C9 · Espacement qui s'ouvre",
  flicker: "D13 · Néon qui vacille",
  prism: "E16 · Séparation RVB",
  cinema: "Cinéma",
  elegance: "Élégance",
  viral: "Viral",
  karaoke: "Karaoké",
  neon: "Néon",
  minimal: "Minimal",
};

const FORMATS = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
} as const;
type Format = keyof typeof FORMATS;

const SPEEDS = [0.1, 0.25, 0.5, 1] as const;

const ALL_STYLES: Record<string, CaptionStyle> = { ...PROTOTYPE_PRESETS, ...CAPTION_PRESETS };

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-text-2 flex justify-between">
        {props.label}
        <span className="font-mono">{props.value}</span>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
        className="accent-brand"
      />
    </label>
  );
}

export function AnimationLab() {
  const player = useRef<PlayerRef>(null);
  const [styleId, setStyleId] = useState<string>("spring");
  const [format, setFormat] = useState<Format>("9:16");
  const [speed, setSpeed] = useState<number>(1);
  const [playing, setPlaying] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const base = ALL_STYLES[styleId] ?? PROTOTYPE_PRESETS.spring;
  const [spring, setSpring] = useState(base.animation.spring ?? SPRINGS.pop);
  const [glow, setGlow] = useState(1);
  const [motionBlur, setMotionBlur] = useState(base.animation.motionBlur ?? false);

  const pickStyle = (id: string) => {
    const next = ALL_STYLES[id];
    if (!next) return;
    setStyleId(id);
    setSpring(next.animation.spring ?? SPRINGS.pop);
    setMotionBlur(next.animation.motionBlur ?? false);
    setGlow(1);
  };

  // live settings applied over the chosen style
  const style = useMemo<CaptionStyle>(() => {
    const scaleGlow = (look: CaptionStyle["base"]) =>
      look.deepGlow
        ? { ...look, deepGlow: { ...look.deepGlow, intensity: look.deepGlow.intensity * glow } }
        : look;
    return {
      ...base,
      base: scaleGlow(base.base),
      emphasis: scaleGlow(base.emphasis),
      animation: { ...base.animation, spring, motionBlur },
    };
  }, [base, spring, glow, motionBlur]);

  const words = useMemo(() => demoWords(), []);
  const pages = useMemo(() => paginate(words, style), [words, style]);
  const durationInFrames = Math.ceil((((words.at(-1)?.end ?? 0) + 1500) / 1000) * CAPTION_FPS);
  const inputProps = useMemo<CaptionedVideoProps>(
    () => ({ videoSrc, pages, style }),
    [videoSrc, pages, style],
  );

  useEffect(() => {
    const current = player.current;
    if (!current) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    current.addEventListener("play", onPlay);
    current.addEventListener("pause", onPause);
    return () => {
      current.removeEventListener("play", onPlay);
      current.removeEventListener("pause", onPause);
    };
  }, []);

  useEffect(() => () => (videoSrc ? URL.revokeObjectURL(videoSrc) : undefined), [videoSrc]);

  // lets automated checks (qa-tester, screenshots) jump to an exact frame
  useEffect(() => {
    const lab = window as Window & { __labSeek?: (frame: number) => void };
    lab.__labSeek = (frame) => {
      player.current?.pause();
      player.current?.seekTo(frame);
    };
    return () => {
      delete lab.__labSeek;
    };
  }, []);

  const step = (delta: number) => {
    const current = player.current;
    if (!current) return;
    current.pause();
    current.seekTo(Math.max(0, current.getCurrentFrame() + delta));
  };

  const onVideo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setVideoSrc(URL.createObjectURL(file));
  };

  const { width, height } = FORMATS[format];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-full overflow-hidden rounded-xl"
          style={{ maxWidth: `calc(70vh * ${width / height})`, background: LAB_BACKDROP }}
        >
          <Player
            ref={player}
            component={CaptionedVideo}
            inputProps={inputProps}
            durationInFrames={durationInFrames}
            compositionWidth={width}
            compositionHeight={height}
            fps={CAPTION_FPS}
            playbackRate={speed}
            controls
            loop
            clickToPlay
            acknowledgeRemotionLicense
            style={{ width: "100%", aspectRatio: `${width} / ${height}` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => step(-1)}
            aria-label="Image précédente"
          >
            <ChevronLeft />
          </Button>
          <Button
            size="icon"
            onClick={() => player.current?.toggle()}
            aria-label={playing ? "Pause" : "Lecture"}
          >
            {playing ? <Pause /> : <Play />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Image suivante">
            <ChevronRight />
          </Button>
          {SPEEDS.map((value) => (
            <Button
              key={value}
              variant={speed === value ? "default" : "outline"}
              size="sm"
              onClick={() => setSpeed(value)}
            >
              {value === 1 ? "Vitesse normale" : `Ralenti ×${value}`}
            </Button>
          ))}
        </div>
      </div>

      <aside className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Prototypes (à valider)</h2>
          {PROTOTYPE_IDS.map((id) => (
            <Button
              key={id}
              variant={styleId === id ? "default" : "outline"}
              className="justify-start"
              onClick={() => pickStyle(id)}
            >
              {LABELS[id]}
            </Button>
          ))}
          <h2 className="mt-2 font-semibold">Styles actuels (pour comparer)</h2>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_IDS.map((id) => (
              <Button
                key={id}
                size="sm"
                variant={styleId === id ? "default" : "outline"}
                onClick={() => pickStyle(id)}
              >
                {LABELS[id]}
              </Button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Réglages en direct</h2>
          <Slider
            label="Raideur du ressort"
            value={spring.stiffness}
            min={40}
            max={600}
            step={10}
            onChange={(stiffness) => setSpring({ ...spring, stiffness })}
          />
          <Slider
            label="Amortissement (moins = plus de rebond)"
            value={spring.damping}
            min={4}
            max={40}
            step={1}
            onChange={(damping) => setSpring({ ...spring, damping })}
          />
          <Slider
            label="Masse"
            value={spring.mass}
            min={0.2}
            max={2}
            step={0.1}
            onChange={(mass) => setSpring({ ...spring, mass })}
          />
          <Slider label="Lueur (×)" value={glow} min={0} max={2} step={0.1} onChange={setGlow} />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={motionBlur}
              onChange={(event) => setMotionBlur(event.target.checked)}
              className="accent-brand size-4"
            />
            Flou de mouvement
          </label>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Format</h2>
          <div className="flex gap-2">
            {(Object.keys(FORMATS) as Format[]).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={format === value ? "default" : "outline"}
                onClick={() => setFormat(value)}
              >
                {value}
              </Button>
            ))}
          </div>
          <label
            className={cn(
              "border-border text-text-2 hover:bg-surface-2 mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-3 text-sm",
            )}
          >
            <Upload className="size-4" />
            {videoSrc ? "Changer la vidéo de fond" : "Mettre une de mes vidéos en fond"}
            <input type="file" accept="video/*" className="sr-only" onChange={onVideo} />
          </label>
          <p className="text-text-3 text-xs">
            La vidéo reste sur ton ordinateur (rien n’est envoyé). Le texte est un texte de
            démonstration.
          </p>
        </section>
      </aside>
    </div>
  );
}
