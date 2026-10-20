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
import { cn } from "@/lib/utils";

import { saveCustomColors } from "@/features/preferences/actions";
import { MAX_CUSTOM_COLORS } from "@/features/preferences/schemas";

import { setCaptionStyle } from "./actions";
import {
  useCaptionWords,
  usePublishCaptionPresetId,
  usePublishTranscriptVisible,
} from "./caption-words";
import { CaptionPlayer } from "./caption-player";
import { applyColors, type CaptionColors } from "./colors";
import { MovePanel } from "./move-panel";
import {
  blockKey,
  dropBlocks,
  lostBlockKeys,
  hasSharedMoves,
  isApart,
  lineElements,
  placementOf,
  resetElement,
  setApart,
  shiftElement,
  toggleLayer,
  withStyleMoves,
  type CaptionMoves,
  type ElementId,
  type MoveTarget,
  type StyleMoves,
} from "./moves";
import { layoutLines } from "./motion";
import { paginate } from "./paginate";
import type { CaptionEditor } from "./remotion/captioned-video";
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
  initialMoves,
  initialCustomColors,
  titleSlot,
  transcriptionSlot,
}: {
  projectId: string;
  src: string;
  initialPreset: PresetId;
  initialColors: CaptionColors;
  initialTweaks: CaptionTweaks;
  initialMoves: CaptionMoves;
  initialCustomColors: string[];
  titleSlot: ReactNode;
  // null when the project has no video to transcribe: the tab is not shown
  transcriptionSlot: ReactNode | null;
}) {
  const t = useTranslations("captions");
  const words = useCaptionWords();
  const [preset, setPreset] = useState<PresetId>(initialPreset);
  const [colors, setColors] = useState<CaptionColors>(initialColors);
  const [tweaks, setTweaks] = useState<CaptionTweaks>(initialTweaks);
  const [customColors, setCustomColors] = useState<string[]>(initialCustomColors);
  // texts moved by hand, per style; the ref always holds the latest (sent with every save)
  const [moves, setMoves] = useState<CaptionMoves>(initialMoves);
  const movesRef = useRef(moves);
  // the text touched on the video, and whether its moves go to every block
  const [picked, setPicked] = useState<{ key: string; element: ElementId } | null>(null);
  const [everyBlock, setEveryBlock] = useState(false);
  // the moves as they were when the drag started (the drag gives a distance from there)
  const dragBase = useRef<StyleMoves | undefined | null>(null);
  const videoCard = useRef<HTMLDivElement>(null);
  // On a phone the controls open as a sheet at the bottom: once it is there (and the page keeps room
  // below, see pb- on the grid), the video is brought up just under the header, above the sheet.
  const moving = picked !== null;
  useEffect(() => {
    if (!moving || !window.matchMedia("(max-width: 1023px)").matches) return;
    const frame = requestAnimationFrame(() =>
      videoCard.current?.scrollIntoView({ block: "start", behavior: "smooth" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [moving]);
  // an animation was just chosen: the settings preview plays it once (id changes at every click)
  const [replay, setReplay] = useState<{ id: number; mode: "once" | "stop" } | null>(null);
  const [failed, setFailed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("styles");
  // the transcript tab cuts its lines like the chosen style
  const publishPresetId = usePublishCaptionPresetId();
  useEffect(() => {
    publishPresetId?.(preset);
  }, [publishPresetId, preset]);
  const publishTranscriptVisible = usePublishTranscriptVisible();
  useEffect(() => {
    publishTranscriptVisible?.(tab === "transcription");
  }, [publishTranscriptVisible, tab]);
  const [, startSaving] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // the change waiting for its save (they are grouped a moment after the last one)
  const pending = useRef<{
    preset: PresetId;
    colors: CaptionColors;
    tweaks: CaptionTweaks;
    moves: CaptionMoves;
  } | null>(null);

  // Sends the waiting change now. Leaving the page or hiding the tab must not lose the last choice.
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const waiting = pending.current;
    pending.current = null;
    if (waiting) {
      void setCaptionStyle(
        projectId,
        waiting.preset,
        waiting.colors,
        waiting.tweaks,
        waiting.moves,
      );
    }
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
    const nextMoves = movesRef.current;
    pending.current = {
      preset: nextPreset,
      colors: nextColors,
      tweaks: nextTweaks,
      moves: nextMoves,
    };
    timer.current = setTimeout(() => {
      timer.current = null;
      pending.current = null;
      startSaving(async () => {
        const result = await setCaptionStyle(
          projectId,
          nextPreset,
          nextColors,
          nextTweaks,
          nextMoves,
        );
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
    // colours stay; the other adjustments belong to the style that was left (the texts moved by
    // hand stay with their style, its blocks are not the same as the new one's)
    setPicked(null);
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

  function updateCustomColors(next: string[]) {
    setCustomColors(next);
    void saveCustomColors(next);
  }

  function addCustomColor(color: string) {
    updateCustomColors(
      [color, ...customColors.filter((known) => known !== color)].slice(0, MAX_CUSTOM_COLORS),
    );
  }

  function removeCustomColor(color: string) {
    updateCustomColors(customColors.filter((known) => known !== color));
  }

  // every card shows the user's colours, so the choice is made on the real result
  const styles = useMemo(
    () =>
      Object.fromEntries(PRESET_IDS.map((id) => [id, applyColors(CAPTION_PRESETS[id], colors)])),
    [colors],
  );

  function reset() {
    setPicked(null);
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

  // The captions of the video (computed again only when the text, the cuts or the way the style
  // cuts change: never for a colour or a move).
  const { layout, grouping, maxWordsPerPage, maxCharsPerLine } = current;
  const pages = useMemo(
    () => paginate(words, { layout, grouping, maxWordsPerPage, maxCharsPerLine }, preset),
    [words, layout, grouping, maxWordsPerPage, maxCharsPerLine, preset],
  );
  const styleMoves = moves[preset];
  // moves left behind by a change of the text (kept until the user has seen the notice: undo
  // brings the block, and its move, back)
  const lostKeys = useMemo(() => lostBlockKeys(styleMoves, pages), [styleMoves, pages]);

  // the latest moves of this style (arrows held down move faster than the screen is redrawn)
  function freshMoves(): StyleMoves | undefined {
    return movesRef.current[preset];
  }

  function updateMoves(next: StyleMoves, delayMs: number) {
    const all = withStyleMoves(movesRef.current, preset, next);
    movesRef.current = all;
    setMoves(all);
    save(preset, colors, tweaks, delayMs);
  }

  const target: MoveTarget | null = picked
    ? { ...picked, everyBlock: everyBlock && !isApart(styleMoves, picked.key) }
    : null;

  // stable for the player: a new editor object at every render would redraw the video
  const latestMoves = useRef({ fresh: freshMoves, everyBlock, update: updateMoves });
  useEffect(() => {
    latestMoves.current = { fresh: freshMoves, everyBlock, update: updateMoves };
  });
  const editor = useMemo<CaptionEditor>(
    () => ({
      selected: picked,
      onPick: (key, element) => {
        dragBase.current = null;
        setPicked({ key, element });
      },
      onDrag: (key, element, dx, dy, done) => {
        const latest = latestMoves.current;
        if (dragBase.current === null) dragBase.current = latest.fresh();
        const base = dragBase.current;
        const dragged = {
          key,
          element,
          everyBlock: latest.everyBlock && !isApart(base, key),
        };
        latest.update(shiftElement(base, dragged, dx, dy), done ? 0 : 400);
        if (done) dragBase.current = null;
      },
    }),
    [picked],
  );

  // what the picked text says (title of the panel)
  const pickedInfo = useMemo(() => {
    if (!picked) return null;
    const page = pages.find((candidate) => blockKey(candidate) === picked.key);
    if (!page) return { text: "", isKeyWord: picked.element === "emphasis" };
    if (picked.element === "emphasis") {
      return {
        text: page.words.find((word) => word.emphasis)?.text ?? "",
        isKeyWord: true,
      };
    }
    const lines = layoutLines(page.words, current);
    const elements = lineElements(lines, page.words, current.layout === "stack");
    const line = lines[elements.indexOf(picked.element)] ?? [];
    return {
      text: line.map((index) => page.words[index]?.text ?? "").join(" "),
      isKeyWord: false,
    };
  }, [picked, pages, current]);

  const placement = picked ? placementOf(styleMoves, picked.key, picked.element) : null;

  // no text yet: the video shows no caption, say why and where to start
  const needsText = words.length === 0 && transcriptionSlot !== null;

  // the page does not scroll on a desktop: both cards end at the bottom of the window.
  // --studio-offset: header (3.8rem) + back link + paddings.
  return (
    <div
      data-moving={picked ? "true" : undefined}
      className="grid gap-5 [--studio-offset:8.25rem] max-lg:data-[moving=true]:pb-[20rem] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start"
    >
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
            onChange={(next) => {
              setPicked(null);
              setTab(next);
            }}
            moreLabel={t("moreTabs")}
          />
          {/* A text touched on the video: its controls take the place of the panel (on a phone, a
              sheet at the bottom of the screen, so the video stays in view above it). */}
          {picked && target && pickedInfo && placement ? (
            <div className="bg-surface border-border fixed inset-x-0 bottom-0 z-40 max-h-[60dvh] overflow-y-auto overscroll-contain rounded-t-2xl border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg lg:static lg:z-auto lg:max-h-none lg:flex-1 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-4 lg:shadow-none">
              <MovePanel
                text={pickedInfo.text}
                isKeyWord={pickedInfo.isKeyWord}
                layer={placement.layer}
                canReset={placement.x !== 0 || placement.y !== 0 || placement.layer !== undefined}
                everyBlock={everyBlock}
                apart={isApart(styleMoves, picked.key)}
                // shown while the block is apart, even once nothing is moved for every block any more
                showApart={hasSharedMoves(styleMoves) || isApart(styleMoves, picked.key)}
                onShift={(dx, dy) => updateMoves(shiftElement(freshMoves(), target, dx, dy), 400)}
                onReset={() => {
                  // back to the base place: this block's own move, and the shared one if it is on
                  let next = resetElement(freshMoves(), { ...target, everyBlock: false });
                  if (target.everyBlock) next = resetElement(next, target);
                  updateMoves(next, 0);
                }}
                onLayer={(layer) => updateMoves(toggleLayer(freshMoves(), target, layer), 0)}
                onEveryBlock={setEveryBlock}
                onApart={(apart) => updateMoves(setApart(freshMoves(), picked.key, apart), 0)}
                onDone={() => setPicked(null)}
              />
            </div>
          ) : null}
          {/* Kept mounted while hidden: the text being corrected, its undo history and its
              automatic save survive a visit to the styles. */}
          {transcriptionSlot ? (
            <div
              hidden={tab !== "transcription" || picked !== null}
              className="min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4 [&:not([hidden])]:flex"
            >
              {transcriptionSlot}
            </div>
          ) : null}
          {(tab === "transcription" && transcriptionSlot) || picked ? null : (
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
                replay={replay}
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
                    customColors={customColors}
                    onColors={recolor}
                    onTweaks={retweak}
                    onAddCustomColor={addCustomColor}
                    onRemoveCustomColor={removeCustomColor}
                    onReplay={(mode) => setReplay((last) => ({ id: (last?.id ?? 0) + 1, mode }))}
                    onResetAll={resetSettings}
                  />
                }
              />
            </>
          )}
        </div>
      </div>

      {/* right: the video in a card as tall as the left panel; it never moves while the panel scrolls */}
      <div
        ref={videoCard}
        data-moving={picked ? "true" : undefined}
        className="bg-surface border-border order-1 flex scroll-mt-28 flex-col items-center justify-center gap-2 rounded-2xl border p-3 [--player-room:15rem] max-lg:data-[moving=true]:[--player-room:28rem] lg:sticky lg:top-[4.75rem] lg:order-2 lg:h-[calc(100dvh-var(--studio-offset))]"
      >
        <div className="w-full shrink-0">{titleSlot}</div>
        <CaptionPlayer src={src} style={current} pages={pages} moves={styleMoves} editor={editor} />
        {/* keeps its room while a text is moved: the video does not jump */}
        {lostKeys.length > 0 ? (
          <div
            role="status"
            className="bg-surface-2 text-text-2 flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-xs"
          >
            <p>{t("move.lost", { count: lostKeys.length })}</p>
            <button
              type="button"
              onClick={() => updateMoves(dropBlocks(freshMoves(), lostKeys), 0)}
              className="text-brand focus-visible:ring-brand min-h-11 shrink-0 rounded px-2 font-medium focus-visible:ring-2 focus-visible:outline-none"
            >
              {t("move.lostOk")}
            </button>
          </div>
        ) : null}
        {words.length > 0 ? (
          <p
            aria-hidden={picked ? true : undefined}
            className={cn("text-text-3 shrink-0 text-center text-xs", picked && "invisible")}
          >
            {t("move.hint")}
          </p>
        ) : null}
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
