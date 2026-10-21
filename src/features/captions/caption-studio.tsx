"use client";

import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
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
  useBlockRequest,
  usePublishLostMoves,
  useMovesBridge,
  usePublishMovesSave,
  usePublishSplitBlocks,
  usePublishPickedBlock,
  useRequestBlock,
  usePublishTranscriptVisible,
} from "./caption-words";
import { CaptionPlayer } from "./caption-player";
import { applyColors, type CaptionColors } from "./colors";
import { MovePanel } from "./move-panel";
import {
  blockKey,
  isHidden,
  isSplit,
  lostBlockKeys,
  hasSharedMoves,
  isApart,
  placementOf,
  resetElement,
  resetBlock,
  isBlockMoved,
  setApart,
  setHidden,
  setSplit,
  shiftElement,
  withStyleMoves,
  type CaptionMoves,
  type PartId,
  type ElementId,
  type MoveTarget,
  type StyleMoves,
} from "./moves";
import type { SplitBlocks } from "./caption-words";
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
// arrow presses closer than this are one step of the undo history
const MOVES_BURST_MS = 900;
const MAX_MOVES_STEPS = 100;

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
  // "this block only" is chosen by default, each time another text is picked
  const [scope, setScope] = useState<{ id: string; all: boolean }>({ id: "", all: false });
  const pickedId = picked ? `${picked.key}|${picked.element}` : "";
  const everyBlock = scope.id === pickedId && scope.all;
  const setEveryBlock = (all: boolean) => setScope({ id: pickedId, all });
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
  // the text is checked before the style is chosen: the transcript is the first tab
  const [tab, setTab] = useState<TabId>(transcriptionSlot ? "transcription" : "styles");
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
  const publishSave = usePublishMovesSave();
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
    publishSave?.("saving");
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
        publishSave?.(result.ok ? "saved" : "error");
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

  // The transcript tab asks for a block to be selected on the video (the icon of a line).
  const blockRequest = useBlockRequest();
  const requestBlock = useRequestBlock();
  const [handledRequest, setHandledRequest] = useState(blockRequest?.id ?? 0);
  if (blockRequest && blockRequest.id !== handledRequest) {
    setHandledRequest(blockRequest.id);
    // a word opened on the transcript, or the text put back to the original: the block is let go
    if (blockRequest.kind === "clear" || blockRequest.kind === "reset-moves") setPicked(null);
    if (blockRequest.kind === "select") {
      const page = pages.find((candidate) => candidate.firstWord >= blockRequest.firstWord);
      if (page) {
        const key = blockKey(page);
        const both =
          page.words.some((word) => word.emphasis) && page.words.some((word) => !word.emphasis);
        setPicked({ key, element: both && isSplit(styleMoves, key) ? "text" : "block" });
      }
    }
  }

  // The cross on the frame (or the panel button): the transcript removes the block's words.
  function deleteBlock(key: string) {
    const page = pages.find((candidate) => blockKey(candidate) === key);
    if (page) requestBlock?.("delete", page.firstWord);
    setPicked(null);
  }
  // Splitting a block in two parts (its text, its key word) and putting it back.
  function splitBlock(key: string) {
    updateMoves(setSplit(freshMoves(), key, true), 0);
    setPicked({ key, element: "text" });
  }
  function mergeBlock(key: string) {
    updateMoves(setSplit(freshMoves(), key, false), 0);
    setPicked(null);
  }
  // The eye of a line of the transcript list: the block is hidden on the video (its words stay),
  // or shown again.
  function toggleHidden(key: string) {
    updateMoves(setHidden(freshMoves(), key, !isHidden(freshMoves(), key)), 0);
    setPicked(null);
  }
  // Removing the words of a part for good: the transcript does it (one step of its undo history).
  function deletePart(key: string, part: PartId) {
    const page = pages.find((candidate) => blockKey(candidate) === key);
    if (page) requestBlock?.(part === "text" ? "delete-text" : "delete-emphasis", page.firstWord);
    setPicked(null);
  }

  // The split and the hidden blocks, told to the transcript list (its "merge" icons and its eyes).
  const splitInfo = useMemo(() => {
    const info: SplitBlocks = {};
    for (const page of pages) {
      const key = blockKey(page);
      const both =
        page.words.some((word) => word.emphasis) && page.words.some((word) => !word.emphasis);
      const split = both && isSplit(styleMoves, key);
      const hidden = isHidden(styleMoves, key);
      if (split || hidden) info[page.firstWord] = { split, hidden };
    }
    return info;
  }, [pages, styleMoves]);
  const splitKey = JSON.stringify(splitInfo);
  const publishSplit = usePublishSplitBlocks();
  useEffect(() => {
    publishSplit?.(JSON.parse(splitKey) as SplitBlocks);
  }, [publishSplit, splitKey]);

  // The block being moved, told to the transcript list (its line is tinted).
  const publishPicked = usePublishPickedBlock();
  const pickedFirstWord = picked
    ? (pages.find((page) => blockKey(page) === picked.key)?.firstWord ?? null)
    : null;
  useEffect(() => {
    publishPicked?.(pickedFirstWord);
  }, [publishPicked, pickedFirstWord]);

  // Moves left behind by a change of the text: they are kept (undo brings the block, and its move,
  // back) and the transcript tab tells the user in its notice.
  const lostCount = useMemo(() => lostBlockKeys(styleMoves, pages).length, [styleMoves, pages]);
  const publishLostMoves = usePublishLostMoves();
  useEffect(() => {
    publishLostMoves?.({ presetId: preset, count: lostCount });
  }, [publishLostMoves, preset, lostCount]);

  // the latest moves of this style (arrows held down move faster than the screen is redrawn)
  function freshMoves(): StyleMoves | undefined {
    return movesRef.current[preset];
  }

  // Every change of the moves can be undone (the undo / redo buttons of the transcript tab take
  // them in the order they were made, with the corrections of the text). A burst of arrow presses
  // or one drag is one step.
  const movesPast = useRef<CaptionMoves[]>([]);
  const movesFuture = useRef<CaptionMoves[]>([]);
  const lastRecord = useRef(0);
  const bridge = useMovesBridge();
  function recordMoves(grouped: boolean) {
    const now = Date.now();
    const sameBurst = grouped && now - lastRecord.current < MOVES_BURST_MS;
    lastRecord.current = now;
    if (sameBurst) return;
    movesPast.current = [...movesPast.current.slice(-(MAX_MOVES_STEPS - 1)), movesRef.current];
    movesFuture.current = [];
    bridge.changed();
  }
  function restoreMoves(all: CaptionMoves) {
    movesRef.current = all;
    setMoves(all);
    save(preset, colors, tweaks, 0);
  }
  function undoMoves() {
    const previous = movesPast.current[movesPast.current.length - 1];
    if (!previous) return;
    movesPast.current = movesPast.current.slice(0, -1);
    movesFuture.current = [movesRef.current, ...movesFuture.current];
    restoreMoves(previous);
  }
  function redoMoves() {
    const [next, ...rest] = movesFuture.current;
    if (!next) return;
    movesFuture.current = rest;
    movesPast.current = [...movesPast.current, movesRef.current];
    restoreMoves(next);
  }
  useEffect(() => {
    bridge.setHandlers({
      undo: undoMoves,
      redo: redoMoves,
      retry: () => save(preset, colors, tweaks, 0),
    });
  });

  // record: true = a step of the history; "burst" = joins the previous step when it follows closely;
  // false = no step (the rest of a drag)
  function updateMoves(next: StyleMoves, delayMs: number, record: boolean | "burst" = true) {
    if (record) recordMoves(record === "burst");
    const all = withStyleMoves(movesRef.current, preset, next);
    movesRef.current = all;
    setMoves(all);
    save(preset, colors, tweaks, delayMs);
  }

  // The text went back to the original: every move, split and hidden part of every style goes too
  // (one step of the history, so it can be taken back).
  function clearAllMoves() {
    if (Object.keys(movesRef.current).length === 0) return;
    recordMoves(false);
    movesRef.current = {};
    setMoves({});
    save(preset, colors, tweaks, 0);
  }

  const target: MoveTarget | null = picked
    ? { ...picked, everyBlock: everyBlock && !isApart(styleMoves, picked.key) }
    : null;

  // stable for the player: a new editor object at every render would redraw the video
  const latestMoves = useRef({
    fresh: freshMoves,
    everyBlock,
    update: updateMoves,
    remove: deleteBlock,
    split: splitBlock,
    merge: mergeBlock,
    toggle: toggleHidden,
    removePart: deletePart,
    clearAll: clearAllMoves,
  });
  useEffect(() => {
    latestMoves.current = {
      fresh: freshMoves,
      everyBlock,
      update: updateMoves,
      remove: deleteBlock,
      split: splitBlock,
      merge: mergeBlock,
      toggle: toggleHidden,
      removePart: deletePart,
      clearAll: clearAllMoves,
    };
  });

  // The transcript list asks for a block to be merged back, or a hidden part to be shown again.
  const handledMoves = useRef(blockRequest?.id ?? 0);
  useEffect(() => {
    if (!blockRequest || blockRequest.id === handledMoves.current) return;
    handledMoves.current = blockRequest.id;
    if (blockRequest.kind === "reset-moves") {
      latestMoves.current.clearAll();
      return;
    }
    const page = pages.find((candidate) => candidate.firstWord >= blockRequest.firstWord);
    if (!page) return;
    const key = blockKey(page);
    const latest = latestMoves.current;
    if (blockRequest.kind === "merge") latest.merge(key);
    else if (blockRequest.kind === "toggle-hidden") latest.toggle(key);
  }, [blockRequest, pages]);
  const deleteLabel = t("move.deleteBlock");
  const splitLabel = t("move.split");
  const deleteTextLabel = t("move.deleteText");
  const deleteKeyWordLabel = t("move.deleteKeyWord");
  const editor = useMemo<CaptionEditor>(
    () => ({
      selected: picked,
      onPick: (key, element) => {
        dragBase.current = null;
        setPicked({ key, element });
      },
      onDeselect: () => {
        dragBase.current = null;
        setPicked(null);
      },
      onCross: (key, element) => {
        const latest = latestMoves.current;
        if (element === "text" || element === "emphasis") latest.removePart(key, element);
        else latest.remove(key);
      },
      onSplit: (key) => latestMoves.current.split(key),
      labels: {
        delete: deleteLabel,
        split: splitLabel,
        deleteText: deleteTextLabel,
        deleteKeyWord: deleteKeyWordLabel,
      },
      onDrag: (key, element, dx, dy, done) => {
        const latest = latestMoves.current;
        const first = dragBase.current === null;
        if (dragBase.current === null) dragBase.current = latest.fresh();
        const base = dragBase.current;
        const dragged = {
          key,
          element,
          everyBlock: latest.everyBlock && !isApart(base, key),
        };
        // one drag = one step of the history, taken at its first move
        latest.update(shiftElement(base, dragged, dx, dy), done ? 0 : 400, first);
        if (done) dragBase.current = null;
      },
    }),
    [picked, deleteLabel, splitLabel, deleteTextLabel, deleteKeyWordLabel],
  );

  // what the picked text says (title of the panel), and what can be done with it
  const pickedInfo = useMemo(() => {
    if (!picked) return null;
    const page = pages.find((candidate) => blockKey(candidate) === picked.key);
    const kind: "block" | PartId =
      picked.element === "text" || picked.element === "emphasis" ? picked.element : "block";
    if (!page) return { text: "", kind, canSplit: false };
    const chosen = page.words.filter((word) =>
      kind === "block" ? true : kind === "emphasis" ? word.emphasis : !word.emphasis,
    );
    return {
      text: chosen.map((word) => word.text).join(" "),
      kind,
      canSplit:
        page.words.some((word) => word.emphasis) && page.words.some((word) => !word.emphasis),
    };
  }, [picked, pages]);

  const placement = picked ? placementOf(styleMoves, picked.key, picked.element) : null;

  // On the transcript tab, the move window sits in the top right corner of the list (small, the
  // lines stay readable); on the styles tab it takes the place of the panel, as before.
  const moveSlot =
    picked && tab === "transcription" && typeof document !== "undefined"
      ? document.querySelector<HTMLElement>("[data-move-slot]")
      : null;

  // The content of the move window. On a phone it is a sheet at the bottom of the screen (the video
  // stays in view above it); on a desktop, in place of the panel or in the corner of the list.
  const moveContent =
    picked && target && pickedInfo && placement ? (
      <MovePanel
        text={pickedInfo.text}
        kind={pickedInfo.kind}
        canSplit={pickedInfo.canSplit}
        // a whole block: lit when anything of it was moved; a part (text / key word): that part only
        canReset={
          pickedInfo.kind === "block"
            ? isBlockMoved(styleMoves, picked.key)
            : placement.x !== 0 || placement.y !== 0 || placement.layer !== undefined
        }
        everyBlock={everyBlock}
        apart={isApart(styleMoves, picked.key)}
        // shown while the block is apart, even once nothing is moved for every block any more
        showApart={hasSharedMoves(styleMoves) || isApart(styleMoves, picked.key)}
        onShift={(dx, dy) => updateMoves(shiftElement(freshMoves(), target, dx, dy), 400, "burst")}
        onReset={() => {
          if (pickedInfo.kind === "block") {
            // the whole block goes back to where the captions were made
            updateMoves(resetBlock(freshMoves(), picked.key, target.everyBlock), 0);
            return;
          }
          // a part goes back to the base place: its own move, and the shared one if it is on
          let next = resetElement(freshMoves(), { ...target, everyBlock: false });
          if (target.everyBlock) next = resetElement(next, target);
          updateMoves(next, 0);
        }}
        onSplit={() => splitBlock(picked.key)}
        onMerge={() => mergeBlock(picked.key)}
        onDelete={() => {
          if (pickedInfo.kind === "block") deleteBlock(picked.key);
          else deletePart(picked.key, pickedInfo.kind);
        }}
        onPart={(part) => setPicked({ key: picked.key, element: part })}
        onEveryBlock={setEveryBlock}
        onApart={(apart) => updateMoves(setApart(freshMoves(), picked.key, apart), 0)}
        onDone={() => setPicked(null)}
      />
    ) : null;
  const MOVE_SHEET =
    "bg-surface border-border fixed inset-x-0 bottom-0 z-40 max-h-[60dvh] overflow-y-auto overscroll-contain rounded-t-2xl border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg lg:static lg:z-auto lg:max-h-none";

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
              ...(transcriptionSlot
                ? [{ id: "transcription" as const, label: t("tabTranscription") }]
                : []),
              { id: "styles", label: t("tabStyles") },
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
          {moveContent && !moveSlot ? (
            <div
              className={cn(
                MOVE_SHEET,
                "lg:flex-1 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-4 lg:shadow-none",
              )}
            >
              {moveContent}
            </div>
          ) : null}
          {moveContent && moveSlot
            ? createPortal(
                <div
                  className={cn(
                    MOVE_SHEET,
                    "pointer-events-auto lg:max-h-none lg:w-80 lg:shrink-0 lg:rounded-xl lg:border lg:p-3 lg:shadow-lg",
                  )}
                >
                  {moveContent}
                </div>,
                moveSlot,
              )
            : null}
          {/* Kept mounted while hidden: the text being corrected, its undo history and its
              automatic save survive a visit to the styles. */}
          {transcriptionSlot ? (
            <div
              hidden={tab !== "transcription"}
              className="min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4 lg:overflow-hidden [&:not([hidden])]:flex"
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
