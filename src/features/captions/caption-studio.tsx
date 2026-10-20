"use client";

import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";

import { setCaptionStyle } from "./actions";
import { useCaptionWords } from "./caption-words";
import { CaptionPlayer } from "./caption-player";
import { applyColors, type CaptionColors } from "./colors";
import { CAPTION_PRESETS, CARD_LIGHTS, DEFAULT_PRESET, PRESET_IDS, type PresetId } from "./presets";
import { SettingsPanel } from "./settings-panel";
import { PANEL_CARD, StylePanel } from "./style-panel";
import { StudioGuide } from "./studio-guide";
import { StudioTabs, type TabId } from "./studio-tabs";
import { applyTweaks, hasTweaks, type CaptionTweaks } from "./tweaks";

// Colour pickers save a moment after the last change (a native picker fires on every move).
const SAVE_DELAY_MS = 500;

// The video with its captions, the gallery of styles (each one animated in a loop) and the settings
// (colours, font, animation, position, outline). Every choice applies at once and is saved in the
// background.
export function CaptionStudio({
  projectId,
  src,
  initialPreset,
  initialColors,
  initialTweaks,
  titleSlot,
  transcriptionSlot,
}: {
  projectId: string;
  src: string;
  initialPreset: PresetId;
  initialColors: CaptionColors;
  initialTweaks: CaptionTweaks;
  titleSlot: ReactNode;
  // null when the project has no video to transcribe: the tab is not shown
  transcriptionSlot: ReactNode | null;
}) {
  const t = useTranslations("captions");
  const words = useCaptionWords();
  const [preset, setPreset] = useState<PresetId>(initialPreset);
  const [colors, setColors] = useState<CaptionColors>(initialColors);
  const [tweaks, setTweaks] = useState<CaptionTweaks>(initialTweaks);
  const [failed, setFailed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("styles");
  const [, startSaving] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // the change waiting for its save (they are grouped a moment after the last one)
  const pending = useRef<{ preset: PresetId; colors: CaptionColors; tweaks: CaptionTweaks } | null>(
    null,
  );

  // Sends the waiting change now. Leaving the page or hiding the tab must not lose the last choice.
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const waiting = pending.current;
    pending.current = null;
    if (waiting) void setCaptionStyle(projectId, waiting.preset, waiting.colors, waiting.tweaks);
  }, [projectId]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  function save(
    nextPreset: PresetId,
    nextColors: CaptionColors,
    nextTweaks: CaptionTweaks,
    delayMs: number,
  ) {
    setFailed(false);
    if (timer.current) clearTimeout(timer.current);
    pending.current = { preset: nextPreset, colors: nextColors, tweaks: nextTweaks };
    timer.current = setTimeout(() => {
      timer.current = null;
      pending.current = null;
      startSaving(async () => {
        const result = await setCaptionStyle(projectId, nextPreset, nextColors, nextTweaks);
        if (!result.ok) setFailed(true);
      });
    }, delayMs);
  }

  function choose(next: PresetId) {
    // choosing the style that is already chosen opens its settings
    if (next === preset) {
      setSettingsOpen(true);
      return;
    }
    // colours stay; the other adjustments belong to the style that was left
    setPreset(next);
    setTweaks({});
    save(next, colors, {}, 0);
  }

  function recolor(next: CaptionColors) {
    setColors(next);
    save(preset, next, tweaks, SAVE_DELAY_MS);
  }

  function retweak(next: CaptionTweaks) {
    setTweaks(next);
    save(preset, colors, next, 300);
  }

  function resetSettings() {
    setColors({});
    setTweaks({});
    save(preset, {}, {}, 0);
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
    setTweaks({});
    save(DEFAULT_PRESET, {}, {}, 0);
  }

  const hasColors = Boolean(colors.text || colors.accent);
  const isDefault = preset === DEFAULT_PRESET && !hasColors && !hasTweaks(tweaks);

  // the video and the settings preview show the style with all the adjustments
  const current = useMemo(
    () => applyTweaks(styles[preset] ?? CAPTION_PRESETS[preset], tweaks),
    [styles, preset, tweaks],
  );

  // no text yet: the video shows no caption, say why and where to start
  const needsText = words.length === 0 && transcriptionSlot !== null;

  // the page does not scroll on a desktop: both cards end at the bottom of the window.
  // --studio-offset: header (3.8rem) + back link + paddings.
  return (
    <div className="grid gap-5 [--studio-offset:8.25rem] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <div className="order-2 lg:sticky lg:top-[4.75rem] lg:order-1 lg:h-[calc(100dvh-var(--studio-offset))]">
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
            <>
              <StudioGuide />
              <StylePanel
                text={{
                  title: t("stylesTitle"),
                  count: t("stylesCount", { count: PRESET_IDS.length }),
                  reset: t("resetStyle"),
                  settings: t("settingsTitle"),
                  back: t("backToStyles"),
                  openSettings: t("openSettings"),
                  livePreview: t("livePreview"),
                  personalize: t("personalize"),
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
                  <SettingsPanel
                    colors={colors}
                    tweaks={tweaks}
                    onColors={recolor}
                    onTweaks={retweak}
                    onResetAll={resetSettings}
                    changed={hasColors || hasTweaks(tweaks)}
                  />
                }
              />
            </>
          )}
        </div>
      </div>

      {/* right: the video in a card as tall as the left panel; it never moves while the panel scrolls */}
      <div className="bg-surface border-border order-1 flex flex-col items-center justify-center gap-2 rounded-2xl border p-3 lg:sticky lg:top-[4.75rem] lg:order-2 lg:h-[calc(100dvh-var(--studio-offset))]">
        <div className="w-full shrink-0">{titleSlot}</div>
        <CaptionPlayer src={src} style={current} />
        {needsText ? (
          <div className="text-text-2 flex shrink-0 flex-col items-center gap-2 text-center text-sm">
            <p>{t("noWords")}</p>
            {tab !== "transcription" ? (
              <Button variant="outline" size="sm" onClick={() => setTab("transcription")}>
                {t("goTranscription")}
              </Button>
            ) : null}
          </div>
        ) : null}
        {failed ? (
          <p role="alert" className="text-danger text-sm">
            {t("saveFailed")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
