"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { CAPTION_FPS } from "../caption-player";
import { SPRINGS } from "../motion";
import { paginate } from "../paginate";
import { CAPTION_PRESETS, LAB_BACKDROP, PRESET_IDS, type PresetId } from "../presets";
import { CaptionedVideo, type CaptionedVideoProps } from "../remotion/captioned-video";
import { PANEL_CARD, StylePanel } from "../style-panel";
import type { CaptionStyle } from "../style";
import { demoWords } from "./demo-words";

// Internal animation lab (not translated on purpose, like /dev/themes): every style on the same
// text, in slow motion or frame by frame, with live settings. Used to tune the "feeling".

const LABELS: Record<PresetId, string> = {
  cinema: "Cinéma",
  elegance: "Élégance",
  editorial: "Éditorial",
  signature: "Signature",
  minimal: "Minimal",
  pop: "Pop à ressort",
  highlighter: "Surligneur",
  converge: "Convergence",
  impact: "Impact rouge",
  gold: "Or liquide",
  glass: "Verre",
  liquid: "Remplissage",
};

const FORMAT = { width: 1080, height: 1920 } as const;

const ALL_STYLES: Record<string, CaptionStyle> = CAPTION_PRESETS;

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
  const [styleId, setStyleId] = useState<PresetId>("editorial");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const base = ALL_STYLES[styleId] ?? CAPTION_PRESETS.editorial;
  const [spring, setSpring] = useState(base.animation.spring ?? SPRINGS.pop);
  const [glow, setGlow] = useState(1);
  const [motionBlur, setMotionBlur] = useState(base.animation.motionBlur ?? false);

  const pickStyle = (id: PresetId) => {
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
    () => ({ videoSrc: null, pages, style }),
    [pages, style],
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

  const { width, height } = FORMAT;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <div className="order-2 lg:sticky lg:top-6 lg:order-1 lg:h-[calc(100dvh-3rem)]">
        <div className={PANEL_CARD}>
          <StylePanel
            text={{
              title: "Styles de sous-titres",
              count: `${PRESET_IDS.length} styles`,
              reset: "Réinitialiser le style",
              settings: "Réglages",
              back: "Retour aux styles",
              openSettings: "Réglages de ce style",
              livePreview: "Aperçu en direct",
              personalize: "Personnaliser le style",
            }}
            selected={styleId}
            labelOf={(id) => LABELS[id]}
            styleOf={(id) => CAPTION_PRESETS[id]}
            current={style}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
            onSelect={pickStyle}
            onReset={() => pickStyle(styleId)}
            resetDisabled={false}
            settings={
              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">Animation</h3>
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
                <Slider
                  label="Lueur (×)"
                  value={glow}
                  min={0}
                  max={2}
                  step={0.1}
                  onChange={setGlow}
                />
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
            }
          />
        </div>
      </div>

      {/* the video stays where it is while the left panel scrolls */}
      <div className="bg-surface border-border order-1 flex flex-col items-center justify-center gap-3 rounded-2xl border p-3 lg:sticky lg:top-6 lg:order-2 lg:h-[calc(100dvh-3rem)]">
        <div
          className="w-full overflow-hidden rounded-xl"
          style={{
            maxWidth: `calc((100dvh - 13rem) * ${width / height})`,
            background: LAB_BACKDROP,
          }}
        >
          <Player
            ref={player}
            component={CaptionedVideo}
            inputProps={inputProps}
            durationInFrames={durationInFrames}
            compositionWidth={width}
            compositionHeight={height}
            fps={CAPTION_FPS}
            controls
            loop
            clickToPlay
            acknowledgeRemotionLicense
            // video controls and timeline stay left to right, also on Arabic pages
            style={{ width: "100%", aspectRatio: `${width} / ${height}`, direction: "ltr" }}
          />
        </div>
        <div dir="ltr" className="flex items-center justify-center gap-2">
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
        </div>
      </div>
    </div>
  );
}
