"use client";

import { Check, Palette, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { setCaptionStyle } from "./actions";
import { CaptionPlayer } from "./caption-player";
import { applyColors, type CaptionColors } from "./colors";
import {
  ACCENT_SWATCHES,
  CAPTION_PRESETS,
  CARD_LIGHTS,
  DEFAULT_PRESET,
  PRESET_IDS,
  TEXT_SWATCHES,
  type PresetId,
} from "./presets";
import { PANEL_CARD, StylePanel } from "./style-panel";
import { StudioTabs, type TabId } from "./studio-tabs";

// Colour pickers save a moment after the last change (a native picker fires on every move).
const SAVE_DELAY_MS = 500;

function ColorRow({
  label,
  swatches,
  value,
  onChange,
}: {
  label: string;
  swatches: string[];
  value: string | undefined;
  onChange: (color: string) => void;
}) {
  const t = useTranslations("captions");
  return (
    <div className="flex flex-col gap-2">
      <span className="text-text-2 text-sm">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {swatches.map((color) => {
          const chosen = value?.toUpperCase() === color.toUpperCase();
          return (
            <button
              key={color}
              type="button"
              aria-pressed={chosen}
              aria-label={t("colorSwatch", { color })}
              onClick={() => onChange(color)}
              className={cn(
                "border-border focus-visible:ring-ring flex size-8 items-center justify-center rounded-full border outline-none focus-visible:ring-2",
                chosen && "ring-brand ring-offset-background ring-2 ring-offset-2",
              )}
              style={{ backgroundColor: color }}
            >
              {chosen ? (
                <Check className="size-4 mix-blend-difference" strokeWidth={3} aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
        <label
          className="border-border hover:border-brand-border focus-within:ring-ring relative flex size-8 cursor-pointer items-center justify-center rounded-full border border-dashed focus-within:ring-2"
          title={t("customColor")}
        >
          <Palette className="text-text-2 size-4" aria-hidden="true" />
          <span className="sr-only">{t("customColor")}</span>
          <input
            type="color"
            value={value ?? swatches[0]}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}

// The video with its captions, the gallery of styles (each one animated in a loop) and the two
// colours. Every choice applies at once and is saved in the background.
export function CaptionStudio({
  projectId,
  src,
  initialPreset,
  initialColors,
  titleSlot,
  transcriptionSlot,
}: {
  projectId: string;
  src: string;
  initialPreset: PresetId;
  initialColors: CaptionColors;
  titleSlot: ReactNode;
  // null when the project has no video to transcribe: the tab is not shown
  transcriptionSlot: ReactNode | null;
}) {
  const t = useTranslations("captions");
  const [preset, setPreset] = useState<PresetId>(initialPreset);
  const [colors, setColors] = useState<CaptionColors>(initialColors);
  const [failed, setFailed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("styles");
  const [, startSaving] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function save(nextPreset: PresetId, nextColors: CaptionColors, delayMs: number) {
    setFailed(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startSaving(async () => {
        const result = await setCaptionStyle(projectId, nextPreset, nextColors);
        if (!result.ok) setFailed(true);
      });
    }, delayMs);
  }

  function choose(next: PresetId) {
    setPreset(next);
    save(next, colors, 0);
  }

  function recolor(next: CaptionColors) {
    setColors(next);
    save(preset, next, SAVE_DELAY_MS);
  }

  // every card shows the user's colours, so the choice is made on the real result
  const styles = useMemo(
    () =>
      Object.fromEntries(PRESET_IDS.map((id) => [id, applyColors(CAPTION_PRESETS[id], colors)])),
    [colors],
  );

  function reset() {
    setPreset(DEFAULT_PRESET);
    setColors({});
    save(DEFAULT_PRESET, {}, 0);
  }

  const isDefault = preset === DEFAULT_PRESET && !colors.text && !colors.accent;

  const current = styles[preset] ?? CAPTION_PRESETS[preset];
  const hasColors = Boolean(colors.text || colors.accent);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <div className="order-2 lg:sticky lg:top-20 lg:order-1 lg:h-[calc(100dvh-6rem)]">
        <div className={PANEL_CARD}>
          <StudioTabs
            tabs={[
              { id: "styles", label: t("tabStyles") },
              ...(transcriptionSlot
                ? [{ id: "transcription" as const, label: t("tabTranscription") }]
                : []),
            ]}
            value={tab}
            onChange={setTab}
            moreLabel={t("moreTabs")}
          />
          {tab === "transcription" && transcriptionSlot ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
              {transcriptionSlot}
            </div>
          ) : (
            <StylePanel
              text={{
                title: t("stylesTitle"),
                count: t("stylesCount", { count: PRESET_IDS.length }),
                reset: t("resetStyle"),
                settings: t("settingsTitle"),
                back: t("backToStyles"),
                openSettings: t("openSettings"),
                livePreview: t("livePreview"),
              }}
              selected={preset}
              labelOf={(id) => t(`styles.${id}`)}
              styleOf={(id) => styles[id] ?? CAPTION_PRESETS[id]}
              lightOf={(id) => colors.accent ?? CARD_LIGHTS[id]}
              current={current}
              settingsOpen={settingsOpen}
              onSettingsOpenChange={setSettingsOpen}
              onSelect={choose}
              onReset={reset}
              resetDisabled={isDefault}
              settings={
                <>
                  <section aria-labelledby="caption-colors-title" className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 id="caption-colors-title" className="text-sm font-semibold">
                        {t("colorsTitle")}
                      </h3>
                      {hasColors ? (
                        <button
                          type="button"
                          onClick={() => recolor({})}
                          className="text-text-2 hover:text-text focus-visible:ring-ring flex items-center gap-1.5 rounded-md text-sm outline-none focus-visible:ring-2"
                        >
                          <RotateCcw className="size-3.5" aria-hidden="true" />
                          {t("resetColors")}
                        </button>
                      ) : null}
                    </div>
                    <ColorRow
                      label={t("textColor")}
                      swatches={TEXT_SWATCHES}
                      value={colors.text}
                      onChange={(text) => recolor({ ...colors, text })}
                    />
                    <ColorRow
                      label={t("accentColor")}
                      swatches={ACCENT_SWATCHES}
                      value={colors.accent}
                      onChange={(accent) => recolor({ ...colors, accent })}
                    />
                  </section>
                  <p className="text-text-3 text-sm">{t("moreSettingsSoon")}</p>
                </>
              }
            />
          )}
        </div>
      </div>

      {/* right: the video in a card as tall as the left panel; it never moves while the panel scrolls */}
      <div className="bg-surface border-border order-1 flex flex-col items-center justify-center gap-2 rounded-2xl border p-3 lg:sticky lg:top-20 lg:order-2 lg:h-[calc(100dvh-6rem)]">
        <div className="w-full shrink-0">{titleSlot}</div>
        <CaptionPlayer src={src} style={current} />
        {failed ? (
          <p role="alert" className="text-danger text-sm">
            {t("saveFailed")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
