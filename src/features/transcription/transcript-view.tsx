"use client";

import {
  Check,
  CircleAlert,
  Copy,
  Download,
  Loader2,
  Combine,
  Eye,
  EyeOff,
  Merge,
  Move,
  ReplaceAll,
  Redo2,
  RotateCcw,
  Scissors,
  Undo2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import {
  useBlockRequest,
  useCaptionPresetId,
  useLostMoves,
  useMovesBridge,
  useMovesSave,
  usePickedBlock,
  usePublishCaptionWords,
  useRequestBlock,
  useSplitBlocks,
  useTranscriptVisible,
} from "../captions/caption-words";
import { blockShownAtMs, paginate } from "../captions/paginate";
import { CAPTION_PRESETS } from "../captions/presets";
import { usePlayerControls, usePlayerTime } from "../projects/player";
import { revertTranscript, saveTranscript } from "./actions";
import {
  breakBefore,
  captionLines,
  captionsForExport,
  hiddenCutCount,
  joinAt,
  restoreCuts,
} from "./cuts";
import {
  deleteRange,
  deleteWord,
  deleteWords,
  editWord,
  findMatchIndices,
  replaceAll,
  type TranscriptDraft,
} from "./edit";
import { InlineWordEditor, SearchTool, WordActions } from "./edit-panels";
import { ReplacePanel, type PanelPosition } from "./replace-panel";
import type { Transcript } from "./queries";
import type { TranscriptWord } from "./types";
import {
  findActiveWordIndex,
  findSegmentIndex,
  formatTimestamp,
  isLowConfidence,
  toPlainText,
  toSrt,
} from "./view";

const MAX_UNDO_STEPS = 100;
// Pause after the last change before saving by itself.
const AUTOSAVE_DELAY_MS = 1000;
// how long a short notice stays next to the save status
const NOTICE_MS = 4000;
// a change that undo / redo can take back: a correction of the text, or a move on the video
type Step = "words" | "moves";
// an icon of the tools frame (a larger target on a phone)
const TOOL_BUTTON = "size-11 rounded-lg hover:bg-surface sm:size-9";
// the small text buttons (copy, SRT, revert…): at least 44 px high on a phone and a tablet
const TOUCH_BUTTON = "max-lg:h-11 max-lg:px-4";
// the small frame around one tool (or one pair of tools)
const TOOL_FRAME =
  "border-border bg-surface-2 flex min-w-0 shrink-0 items-center gap-0.5 rounded-xl border p-0.5";

type WordCellProps = {
  word: TranscriptWord;
  index: number;
  active: boolean;
  flagged: boolean;
  matched: boolean;
  currentMatch: boolean;
  canSplit: boolean;
  doubtLabel: string;
  onOpen: (index: number, startMs: number, text: string) => void;
  onDelete: (index: number) => void;
  onSplit: (index: number) => void;
};

// Memoised: the active word changes ~4 times per second while hundreds of words stay untouched.
// While the mouse (or the keyboard focus) is on the word, delete / new-line icons float above it.
const WordCell = memo(function WordCell({
  word,
  index,
  active,
  flagged,
  matched,
  currentMatch,
  canSplit,
  doubtLabel,
  onOpen,
  onDelete,
  onSplit,
}: WordCellProps) {
  return (
    <span className="group/word relative">
      <button
        type="button"
        data-word-index={index}
        title={flagged ? doubtLabel : undefined}
        aria-current={active ? "true" : undefined}
        onClick={() => onOpen(index, word.start, word.text)}
        className={cn(
          "focus-visible:ring-ring rounded px-0.5 transition-colors outline-none focus-visible:ring-2",
          active ? "bg-primary text-primary-foreground" : "hover:bg-accent",
          matched && !active && "bg-spark/25 text-text",
          currentMatch && "ring-brand ring-2",
          flagged &&
            !active &&
            "decoration-warning underline decoration-dotted decoration-2 underline-offset-4",
        )}
      >
        {word.text}
      </button>
      <WordActions
        canSplit={canSplit}
        onDelete={() => onDelete(index)}
        onSplit={() => onSplit(index)}
        className="invisible group-focus-within/word:visible group-hover/word:visible"
      />
    </span>
  );
});

function download(fileName: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

// Same function at every render, always calling the latest version: the memoised lines below are
// not drawn again for nothing.
function useStable<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const latest = useRef(fn);
  useLayoutEffect(() => {
    latest.current = fn;
  });
  return useCallback((...args: A) => latest.current(...args), []);
}

type History = { past: TranscriptDraft[]; present: TranscriptDraft; future: TranscriptDraft[] };
type SaveState = "idle" | "saved" | "error";

export function TranscriptView({
  transcript,
  title,
  projectId,
}: {
  transcript: Transcript;
  title: string;
  projectId: string;
}) {
  const t = useTranslations("transcription");
  const locale = useLocale();
  const timeMs = usePlayerTime();
  const { seek, isPlaying } = usePlayerControls();
  const [showDoubts, setShowDoubts] = useState(true);
  const [copied, setCopied] = useState(false);
  // Word currently open for correction (it turns into a field).
  const [selected, setSelected] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  // Search bar: only finds a word and jumps to it.
  const [find, setFind] = useState("");
  // Replace tool: its own word to look for, separate from the search bar.
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceFind, setReplaceFind] = useState("");
  const [replaceWith, setReplaceWith] = useState("");
  const [replacePosition, setReplacePosition] = useState<PanelPosition>({ x: 16, y: 120 });
  // Short confirmation shown near the save status (e.g. "3 replacements").
  const [notice, setNotice] = useState<string | null>(null);
  // The notice goes away by itself after a few seconds.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);
  // A moved text that lost its place (a cut added or taken away, its first word deleted) is said
  // here. Another style has its own moves: changing style never counts as a loss.
  const lostMoves = useLostMoves();
  const [seenLost, setSeenLost] = useState(lostMoves);
  if (lostMoves !== seenLost) {
    setSeenLost(lostMoves);
    if (lostMoves.presetId === seenLost.presetId && lostMoves.count > seenLost.count) {
      setNotice(t("edit.movesLost", { count: lostMoves.count - seenLost.count }));
    }
  }
  // true once an original text is kept aside on the server (after the first saved correction)
  const [isEdited, setIsEdited] = useState(transcript.is_edited);
  const [revertOpen, setRevertOpen] = useState(false);
  const [revertError, setRevertError] = useState(false);
  const [reverting, startReverting] = useTransition();
  const [currentMatch, setCurrentMatch] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [saving, startSaving] = useTransition();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saved, setSaved] = useState<TranscriptDraft>({
    words: transcript.words,
    segments: transcript.segments,
  });
  const [history, setHistory] = useState<History>({ past: [], present: saved, future: [] });
  // The order of the changes (corrections of the text, moves of the texts on the video): undo and
  // redo take them back one by one, the last one first, whichever side made it.
  const [steps, setSteps] = useState<{ undo: Step[]; redo: Step[] }>({ undo: [], redo: [] });
  const movesBridge = useMovesBridge();
  const movesSave = useMovesSave();
  useEffect(() => {
    movesBridge.onChange(() => setSteps((now) => ({ undo: [...now.undo, "moves"], redo: [] })));
    return () => movesBridge.onChange(null);
  }, [movesBridge]);
  const container = useRef<HTMLDivElement>(null);

  const { words } = history.present;
  // Every correction shows up at once in the captions on the video.
  const publishWords = usePublishCaptionWords();
  useEffect(() => {
    publishWords?.(words);
  }, [publishWords, words]);
  // One line per caption of the chosen style, exactly as on the video. Computed again only when the
  // text, the style or a cut changes (never while the video plays).
  const presetId = useCaptionPresetId();
  const captionStyle = CAPTION_PRESETS[presetId];
  const pages = useMemo(
    () => paginate(words, captionStyle, presetId),
    [words, captionStyle, presetId],
  );
  const lines = useMemo(() => captionLines(pages, words.length), [pages, words.length]);
  const exported = useMemo(() => captionsForExport(pages), [pages]);
  const hiddenCuts = useMemo(() => hiddenCutCount(words, presetId), [words, presetId]);
  const dirty = history.present !== saved;
  // Hidden behind the styles tab: nothing follows the video, so the lines are not drawn again.
  const visible = useTranscriptVisible();
  // The blue word follows the video only while it plays (never while a word is open, nor after a
  // click on the timeline: the seek can land on the word before).
  const activeWord =
    visible && selected === null && isPlaying() ? findActiveWordIndex(words, timeMs) : -1;
  const activeLine = activeWord >= 0 ? findSegmentIndex(lines, activeWord) : -1;
  const doubtCount = useMemo(() => words.filter(isLowConfidence).length, [words]);
  const matchIndices = useMemo(() => findMatchIndices(words, find, false), [words, find]);
  const replaceMatches = useMemo(
    () => findMatchIndices(words, replaceFind.trim(), false),
    [words, replaceFind],
  );
  const matchSet = useMemo(() => new Set(matchIndices), [matchIndices]);

  const languageName = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "language" }).of(transcript.language);
    } catch {
      return transcript.language;
    }
  }, [locale, transcript.language]);

  const commit = useCallback((next: TranscriptDraft | null) => {
    if (!next) return;
    setHistory((current) => ({
      past: [...current.past.slice(-(MAX_UNDO_STEPS - 1)), current.present],
      present: next,
      future: [],
    }));
    setSteps((now) => ({ undo: [...now.undo, "words"], redo: [] }));
    setSaveState("idle");
    setNotice(null);
  }, []);

  const undoWords = useCallback(() => {
    setHistory((current) => {
      const previous = current.past[current.past.length - 1];
      if (!previous) return current;
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
    setSelected(null);
    setCurrentMatch(null);
    setSaveState("idle");
  }, []);

  const redoWords = useCallback(() => {
    setHistory((current) => {
      const [next, ...rest] = current.future;
      if (!next) return current;
      return { past: [...current.past, current.present], present: next, future: rest };
    });
    setSelected(null);
    setCurrentMatch(null);
    setSaveState("idle");
  }, []);

  const undo = useCallback(() => {
    const last = steps.undo[steps.undo.length - 1];
    if (!last) return;
    setSteps({ undo: steps.undo.slice(0, -1), redo: [last, ...steps.redo] });
    if (last === "moves") movesBridge.undo();
    else undoWords();
  }, [steps, movesBridge, undoWords]);

  const redo = useCallback(() => {
    const [next, ...rest] = steps.redo;
    if (!next) return;
    setSteps({ undo: [...steps.undo, next], redo: rest });
    if (next === "moves") movesBridge.redo();
    else redoWords();
  }, [steps, movesBridge, redoWords]);

  // Tapping a word moves the video there, pauses it, and opens the word for correction.
  const requestBlock = useRequestBlock();
  const openWord = useCallback(
    (index: number, startMs: number, text: string) => {
      seek(startMs, false);
      // working on a word lets go of the block being moved on the video
      requestBlock?.("clear", 0);
      setEditText(text);
      setSelected(index);
      // the search is done: it folds and the next time it opens it is empty
      setSearchOpen(false);
      setFind("");
      setCurrentMatch(null);
    },
    [seek, requestBlock],
  );

  // Ctrl/Cmd+Z and Ctrl/Cmd+Y (inside a text field the browser keeps its own undo).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  // Warn before leaving the page with unsaved corrections.
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // While playing, keep the current line in view inside the transcript box (not the whole page).
  useEffect(() => {
    if (activeLine < 0 || !isPlaying()) return;
    const box = container.current;
    const line = box?.querySelector<HTMLElement>(`[data-line-index="${activeLine}"]`);
    if (!box || !line) return;
    const top = line.offsetTop - box.clientHeight / 3;
    box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [activeLine, isPlaying]);

  const save = useCallback(() => {
    const draft = history.present;
    startSaving(async () => {
      const result = await saveTranscript(projectId, draft.words, draft.segments);
      if (result.ok) {
        setSaved(draft);
        setIsEdited(true);
        setSaveState("saved");
      } else {
        setSaveState("error");
      }
    });
  }, [history.present, projectId]);

  // Automatic saving: shortly after the last change (no button). After a failure it waits for the
  // next change or the "Try again" button instead of hammering the server.
  useEffect(() => {
    if (!dirty || saving || saveState === "error") return;
    const timer = setTimeout(save, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dirty, saving, saveState, save]);

  // Leaving the tab (or the phone locking) saves right away.
  useEffect(() => {
    if (!dirty || saving || saveState === "error") return;
    function onHidden() {
      if (document.visibilityState === "hidden") save();
    }
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, [dirty, saving, saveState, save]);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(toPlainText(exported));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked by the browser: the downloads below still work.
    }
  }

  // Typing in the search: when no result is in view, the list scrolls to the first one.
  function changeFind(value: string) {
    setFind(value);
    const found = findMatchIndices(words, value, false);
    const first = found[0];
    setCurrentMatch(first ?? null);
    const box = container.current;
    if (first === undefined || !box) return;
    const room = box.getBoundingClientRect();
    const inView = found.some((index) => {
      const rect = box
        .querySelector<HTMLElement>(`[data-word-index="${index}"]`)
        ?.getBoundingClientRect();
      return rect !== undefined && rect.top >= room.top && rect.bottom <= room.bottom;
    });
    if (inView) return;
    box
      .querySelector<HTMLElement>(`[data-word-index="${first}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  // Enter in the search field: jump to the next result (and wrap around).
  function nextMatch() {
    if (matchIndices.length === 0) return;
    const next = matchIndices.find((index) => index > (currentMatch ?? -1)) ?? matchIndices[0];
    if (next === undefined) return;
    const word = words[next];
    setCurrentMatch(next);
    if (word) seek(word.start, false);
    container.current
      ?.querySelector<HTMLElement>(`[data-word-index="${next}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function commitWord() {
    if (selected !== null) commit(editWord(history.present, selected, editText));
    setSelected(null);
  }

  function removeWord() {
    if (selected !== null) commit(deleteWord(history.present, selected));
    setSelected(null);
  }

  // Changes every match of the replace window (the search bar is not involved). Returns the count.
  function replaceEverywhere(replacement: string): number {
    const result = replaceAll(history.present, replaceFind.trim(), replacement, false);
    if (result.count === 0) return 0;
    commit(result.draft);
    setNotice(t("edit.replaced", { count: result.count }));
    // Done: the next time the panel opens it is empty. (Closing without replacing keeps the words.)
    setReplaceFind("");
    setReplaceWith("");
    setSelected(null);
    return result.count;
  }

  // Opens the floating replace panel in the top right corner of the lines, every time (it can be
  // dragged away, but it comes back there when opened again).
  function toggleReplace() {
    if (replaceOpen) {
      setReplaceOpen(false);
      return;
    }
    setSearchOpen(false);
    const rect = container.current?.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 16);
    setReplacePosition({
      x: Math.max(
        8,
        Math.min((rect?.right ?? window.innerWidth) - width - 12, window.innerWidth - width - 8),
      ),
      y: Math.max(8, Math.min((rect?.top ?? 120) + 8, window.innerHeight - 340)),
    });
    setReplaceOpen(true);
  }

  // Icons floating over a word act on that word directly (no need to open it first).
  // Puts the provider's original text back (asked to confirm first, corrections are lost).
  function revertToOriginal() {
    startReverting(async () => {
      const result = await revertTranscript(projectId);
      if (result.ok) {
        const restored: TranscriptDraft = { words: result.words, segments: result.segments };
        setSaved(restored);
        setHistory({ past: [], present: restored, future: [] });
        setSteps((now) => ({
          undo: now.undo.filter((one) => one === "moves"),
          redo: now.redo.filter((one) => one === "moves"),
        }));
        setIsEdited(false);
        setSaveState("idle");
        setSelected(null);
        // the moves, splits and hidden parts of the captions go back to the start too
        requestBlock?.("reset-moves", 0);
        setNotice(t("edit.revertDone"));
        setRevertOpen(false);
      } else {
        setRevertError(true);
      }
    });
  }

  function deleteAt(index: number) {
    commit(deleteWord(history.present, index));
    setSelected(null);
  }

  // "New line": a caption starts at this word, in this style only (a cut made by hand).
  function splitBefore(index: number) {
    commit(breakBefore(history.present, index, presetId));
    setSelected(null);
  }

  // Starts a new line at the open word (the typed correction is kept).
  function splitAtSelected() {
    if (selected === null) return;
    const edited = editWord(history.present, selected, editText) ?? history.present;
    commit(breakBefore(edited, selected, presetId) ?? (edited === history.present ? null : edited));
    setSelected(null);
  }

  // Brings back the cuts made by hand in other styles.
  function bringBackCuts() {
    commit(restoreCuts(history.present, presetId));
    setSelected(null);
    setNotice(t("edit.cutsRestored"));
  }

  const mergeLine = useStable((index: number) => {
    commit(joinAt(history.present, index, captionStyle, presetId));
    setSelected(null);
  });
  // The icon of a line: its block is selected on the video (which goes to it) to be moved there.
  const moveBlock = useStable((firstWord: number, startMs: number) => {
    // the video goes to a moment where the whole block is on screen
    const page = pages.find((one) => one.firstWord >= firstWord);
    seek(page ? blockShownAtMs(page) : startMs, false);
    requestBlock?.("select", firstWord);
  });

  // The cross on the frame of a block, on the video: the words of that block are removed here (one
  // step of the undo history, so it can be taken back).
  const blockRequest = useBlockRequest();
  const splitBlocks = useSplitBlocks();
  const pickedBlock = usePickedBlock();
  // merge a split block back, or show one of its hidden parts again: the video side does it
  const blockAction = useStable((kind: "merge" | "toggle-hidden", firstWord: number) => {
    requestBlock?.(kind, firstWord);
  });
  const handledBlock = useRef(blockRequest?.id ?? 0);
  const removeBlock = useStable((firstWord: number) => {
    const line = lines.find((one) => one.word_start <= firstWord && firstWord <= one.word_end);
    if (!line) return;
    const next = deleteRange(history.present, line.word_start, line.word_end);
    if (!next) return;
    commit(next);
    setSelected(null);
    setNotice(t("edit.blockDeleted"));
  });
  // The words of one part of a split block (its text, or its key word) removed for good.
  const removePart = useStable((firstWord: number, part: "text" | "emphasis") => {
    const page = pages.find((one) => one.firstWord === firstWord);
    if (!page) return;
    const indices = page.words.flatMap((word, position) =>
      word.emphasis === (part === "emphasis") ? [page.firstWord + position] : [],
    );
    const next = deleteWords(history.present, indices);
    if (!next) return;
    commit(next);
    setSelected(null);
    setNotice(t("edit.wordsDeleted"));
  });
  useEffect(() => {
    if (!blockRequest || blockRequest.id === handledBlock.current) return;
    handledBlock.current = blockRequest.id;
    if (blockRequest.kind === "delete") removeBlock(blockRequest.firstWord);
    else if (blockRequest.kind === "delete-text") removePart(blockRequest.firstWord, "text");
    else if (blockRequest.kind === "delete-emphasis")
      removePart(blockRequest.firstWord, "emphasis");
  }, [blockRequest, removeBlock, removePart]);
  const onCommitWord = useStable(commitWord);
  const onRemoveWord = useStable(removeWord);
  const onSplitAtSelected = useStable(splitAtSelected);
  const onDeleteAt = useStable(deleteAt);
  const onSplitBefore = useStable(splitBefore);

  // Drawn again only when the text, the style, the open word or the word being said changes.
  const lineList = useMemo(
    () =>
      lines.map((line, lineIndex) => {
        const lineStart = words[line.word_start]?.start ?? 0;
        // this line's block, when it is split in two parts on the video
        const block = pages.find((one) => one.firstWord >= line.word_start);
        const info = block ? splitBlocks[block.firstWord] : undefined;
        const split = block && info?.split ? { firstWord: block.firstWord } : null;
        const hiddenBlock = Boolean(info?.hidden);
        const beingMoved = block !== undefined && block.firstWord === pickedBlock;
        return (
          <div
            key={line.word_start}
            data-line-index={lineIndex}
            data-moving={beingMoved ? "true" : undefined}
            className="group data-[moving=true]:bg-brand/15 flex gap-3 leading-8"
          >
            {/* the eye: the whole block is hidden on the video (its words stay), or shown again */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-pressed={hiddenBlock}
              disabled={!block}
              title={hiddenBlock ? t("edit.showBlock") : t("edit.hideBlock")}
              aria-label={hiddenBlock ? t("edit.showBlock") : t("edit.hideBlock")}
              onClick={() => block && blockAction("toggle-hidden", block.firstWord)}
            >
              {hiddenBlock ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
            <button
              type="button"
              onClick={() => seek(lineStart)}
              className="text-muted-foreground hover:text-foreground w-12 shrink-0 text-end text-xs tabular-nums"
              aria-label={t("jumpTo", { time: formatTimestamp(lineStart) })}
            >
              {formatTimestamp(lineStart)}
            </button>
            <div className="min-w-0 flex-1">
              <p className="break-words">
                {words.slice(line.word_start, line.word_end + 1).map((word, offset) => {
                  const index = line.word_start + offset;
                  return (
                    <span key={index}>
                      {index === selected ? (
                        <span className="relative">
                          <InlineWordEditor
                            value={editText}
                            onChange={setEditText}
                            canSplit={index > line.word_start}
                            onCommit={onCommitWord}
                            onSplit={onSplitAtSelected}
                            onDelete={onRemoveWord}
                            onCancel={() => setSelected(null)}
                          />
                          <WordActions
                            keepFocus
                            canSplit={index > line.word_start}
                            onDelete={onRemoveWord}
                            onSplit={onSplitAtSelected}
                          />
                        </span>
                      ) : (
                        <WordCell
                          word={word}
                          index={index}
                          active={index === activeWord}
                          flagged={showDoubts && isLowConfidence(word)}
                          matched={matchSet.has(index)}
                          currentMatch={index === currentMatch}
                          canSplit={index > line.word_start}
                          doubtLabel={t("doubtful", {
                            percent: Math.round((word.confidence ?? 0) * 100),
                          })}
                          onOpen={openWord}
                          onDelete={onDeleteAt}
                          onSplit={onSplitBefore}
                        />
                      )}{" "}
                    </span>
                  );
                })}
                {/* right after the last word, a little apart from it, always in view */}
                {lineIndex > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ms-2 size-8 align-middle"
                    title={t("edit.merge")}
                    aria-label={t("edit.merge")}
                    onClick={() => mergeLine(line.word_start)}
                  >
                    <Merge aria-hidden="true" />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("size-8 align-middle", lineIndex > 0 ? "ms-0.5" : "ms-2")}
                  title={t("edit.moveBlock")}
                  aria-label={t("edit.moveBlock")}
                  onClick={() => moveBlock(line.word_start, lineStart)}
                >
                  <Move aria-hidden="true" />
                </Button>
                {split ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ms-0.5 size-8 align-middle"
                      title={t("edit.mergeBlock")}
                      aria-label={t("edit.mergeBlock")}
                      onClick={() => blockAction("merge", split.firstWord)}
                    >
                      <Combine aria-hidden="true" />
                    </Button>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        );
      }),
    [
      lines,
      words,
      selected,
      editText,
      activeWord,
      showDoubts,
      matchSet,
      currentMatch,
      t,
      seek,
      openWord,
      mergeLine,
      moveBlock,
      pages,
      splitBlocks,
      pickedBlock,
      blockAction,
      onCommitWord,
      onRemoveWord,
      onSplitAtSelected,
      onDeleteAt,
      onSplitBefore,
    ],
  );

  const baseName = title.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60) || "transcript";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {t("detectedLanguage", { language: languageName ?? transcript.language })}
          {transcript.language_confidence !== null
            ? ` · ${Math.round(transcript.language_confidence * 100)} %`
            : ""}
        </p>
        <div data-tools-anchor className="flex flex-wrap gap-2">
          {/* Kept (invisible) when there is nothing to revert: the buttons stay where they are, and
              the search field always starts at the same place. */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(TOUCH_BUTTON, !isEdited && "invisible")}
            aria-hidden={!isEdited}
            tabIndex={isEdited ? undefined : -1}
            disabled={!isEdited || saving || dirty}
            onClick={() => setRevertOpen(true)}
          >
            <RotateCcw aria-hidden="true" />
            {t("edit.revert")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={TOUCH_BUTTON}
            onClick={copyText}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? t("copied") : t("copy")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={TOUCH_BUTTON}
            onClick={() => download(`${baseName}.srt`, toSrt(exported), "application/x-subrip")}
          >
            <Download aria-hidden="true" />
            SRT
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={TOUCH_BUTTON}
            onClick={() => download(`${baseName}.txt`, toPlainText(exported), "text/plain")}
          >
            <Download aria-hidden="true" />
            TXT
          </Button>
        </div>
      </div>

      {/* The tools row: the save status at the start, the tools at the end (they never move). */}
      <div data-tools-row className="flex min-h-11 items-center justify-between gap-2">
        <div
          className="flex min-w-0 flex-1 items-center gap-x-4 overflow-hidden whitespace-nowrap"
          aria-live="polite"
        >
          {saveState === "error" || movesSave === "error" ? (
            <p className="text-danger flex items-center gap-2 text-sm">
              <CircleAlert className="size-4" aria-hidden="true" />
              {t("edit.saveFailed")}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={TOUCH_BUTTON}
                onClick={() => {
                  if (saveState === "error") save();
                  if (movesSave === "error") movesBridge.retry();
                }}
              >
                {t("edit.retry")}
              </Button>
            </p>
          ) : dirty || saving || movesSave === "saving" ? (
            <p className="text-text-2 flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {t("edit.saving")}
            </p>
          ) : saveState === "saved" || movesSave === "saved" ? (
            <p className="text-text-2 flex items-center gap-2 text-sm">
              <Check className="text-success size-4" aria-hidden="true" />
              {t("edit.saved")}
            </p>
          ) : null}
          {notice ? (
            <p className="text-text-2 flex items-center gap-2 text-sm">
              <Check className="text-success size-4" aria-hidden="true" />
              {notice}
            </p>
          ) : null}
        </div>
        {/* The tools, apart from each other: search, replace, then undo / redo together. */}
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <div className={TOOL_FRAME}>
            <SearchTool
              find={find}
              onFind={changeFind}
              matchCount={matchIndices.length}
              onNext={nextMatch}
              buttonClassName={TOOL_BUTTON}
              open={searchOpen}
              onOpenChange={setSearchOpen}
            />
          </div>
          {/* On a phone the open search field takes the room of the other tools (else ~4 letters fit) */}
          <div className={cn(TOOL_FRAME, searchOpen && "max-sm:hidden")}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(TOOL_BUTTON, replaceOpen && "bg-surface text-brand")}
              aria-haspopup="dialog"
              aria-expanded={replaceOpen}
              aria-label={t("edit.replaceToggleHint")}
              title={t("edit.replaceToggleHint")}
              onClick={toggleReplace}
            >
              <ReplaceAll aria-hidden="true" />
            </Button>
          </div>
          <div className={cn(TOOL_FRAME, searchOpen && "max-sm:hidden")}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={TOOL_BUTTON}
              aria-label={t("edit.undo")}
              title={t("edit.undo")}
              disabled={steps.undo.length === 0}
              onClick={undo}
            >
              <Undo2 aria-hidden="true" />
            </Button>
            <span className="bg-border mx-0.5 h-5 w-px shrink-0" aria-hidden="true" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={TOOL_BUTTON}
              aria-label={t("edit.redo")}
              title={t("edit.redo")}
              disabled={steps.redo.length === 0}
              onClick={redo}
            >
              <Redo2 aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {replaceOpen ? (
        <ReplacePanel
          initialPosition={replacePosition}
          find={replaceFind}
          onFind={setReplaceFind}
          replacement={replaceWith}
          onReplacement={setReplaceWith}
          matchCount={replaceMatches.length}
          onReplaceAll={replaceEverywhere}
          onClose={() => setReplaceOpen(false)}
        />
      ) : null}

      {/* The quick help (always there) and, at the end, the cuts and doubts tools. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-text-3 min-w-0 flex-1 basis-64 text-sm leading-5">{t("edit.hint")}</p>
        {hiddenCuts > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={TOUCH_BUTTON}
            onClick={bringBackCuts}
          >
            <Scissors aria-hidden="true" />
            {t("edit.restoreCuts")}
          </Button>
        ) : null}
        {doubtCount > 0 ? (
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showDoubts}
              onChange={(event) => setShowDoubts(event.target.checked)}
              className="accent-primary size-4"
            />
            {t("showDoubts", { count: doubtCount })}
          </label>
        ) : null}
      </div>

      {/* the list, and in its top right corner the place of the "move a block" window */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={container}
          // Extra room on top and between lines: the icons above a word never hide the line above it.
          className="bg-card relative flex max-h-[60vh] min-h-0 flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border p-4 pt-9 lg:max-h-none lg:flex-1 lg:[[data-moving=true]_&]:pe-[21rem]"
        >
          {lineList}
        </div>
        <div
          data-move-slot
          className="pointer-events-none absolute inset-y-3 end-5 z-20 flex min-h-0 flex-col items-end overflow-y-auto overscroll-contain"
        />
      </div>

      <Dialog
        open={revertOpen}
        onOpenChange={(open) => {
          setRevertOpen(open);
          if (!open) setRevertError(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("edit.revertTitle")}</DialogTitle>
            <DialogDescription>{t("edit.revertBody")}</DialogDescription>
          </DialogHeader>
          {revertError ? (
            <p role="alert" className="text-danger flex items-center gap-2 text-sm">
              <CircleAlert className="size-4" aria-hidden="true" />
              {t("edit.revertFailed")}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {t("edit.revertCancel")}
            </DialogClose>
            <Button variant="destructive" disabled={reverting} onClick={revertToOriginal}>
              {reverting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {t("edit.revertConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
