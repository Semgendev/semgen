"use client";

import {
  Check,
  CircleAlert,
  Copy,
  Download,
  Loader2,
  Merge,
  Redo2,
  RotateCcw,
  Undo2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

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

import { usePublishCaptionWords } from "../captions/caption-words";
import { usePlayerControls, usePlayerTime } from "../projects/player";
import { revertTranscript, saveTranscript } from "./actions";
import {
  deleteWord,
  editWord,
  findMatchIndices,
  mergeWithPrevious,
  replaceAll,
  splitSegmentAt,
  type TranscriptDraft,
} from "./edit";
import { InlineWordEditor, SearchBar, WordActions } from "./edit-panels";
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
  // true once an original text is kept aside on the server (after the first saved correction)
  const [isEdited, setIsEdited] = useState(transcript.is_edited);
  const [revertOpen, setRevertOpen] = useState(false);
  const [revertError, setRevertError] = useState(false);
  const [reverting, startReverting] = useTransition();
  const [currentMatch, setCurrentMatch] = useState<number | null>(null);
  const [saving, startSaving] = useTransition();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saved, setSaved] = useState<TranscriptDraft>({
    words: transcript.words,
    segments: transcript.segments,
  });
  const [history, setHistory] = useState<History>({ past: [], present: saved, future: [] });
  const container = useRef<HTMLDivElement>(null);

  const { words, segments } = history.present;
  // Every correction shows up at once in the captions on the video.
  const publishWords = usePublishCaptionWords();
  useEffect(() => {
    publishWords?.(words);
  }, [publishWords, words]);
  // Every correction shows up at once in the captions on the video.  const publishWords = usePublishCaptionWords();  useEffect(() => {    publishWords?.(words);  }, [publishWords, words]);
  const dirty = history.present !== saved;
  const activeWord = findActiveWordIndex(words, timeMs);
  const activeSegment = activeWord >= 0 ? findSegmentIndex(segments, activeWord) : -1;
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
    setSaveState("idle");
    setNotice(null);
  }, []);

  const undo = useCallback(() => {
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

  const redo = useCallback(() => {
    setHistory((current) => {
      const [next, ...rest] = current.future;
      if (!next) return current;
      return { past: [...current.past, current.present], present: next, future: rest };
    });
    setSelected(null);
    setCurrentMatch(null);
    setSaveState("idle");
  }, []);

  // Tapping a word moves the video there, pauses it, and opens the word for correction.
  const openWord = useCallback(
    (index: number, startMs: number, text: string) => {
      seek(startMs, false);
      setEditText(text);
      setSelected(index);
    },
    [seek],
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
    if (activeSegment < 0 || !isPlaying()) return;
    const box = container.current;
    const line = box?.querySelector<HTMLElement>(`[data-segment-index="${activeSegment}"]`);
    if (!box || !line) return;
    const top = line.offsetTop - box.clientHeight / 3;
    box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [activeSegment, isPlaying]);

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
      await navigator.clipboard.writeText(toPlainText(segments));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked by the browser: the downloads below still work.
    }
  }

  function changeFind(value: string) {
    setFind(value);
    setCurrentMatch(null);
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

  // Opens the floating replace panel right where the text starts (below the save status).
  function toggleReplace() {
    if (replaceOpen) {
      setReplaceOpen(false);
      return;
    }
    const rect = container.current?.getBoundingClientRect();
    setReplacePosition({
      x: Math.max(8, Math.min((rect?.left ?? 16) + 16, window.innerWidth - 328)),
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
        setIsEdited(false);
        setSaveState("idle");
        setSelected(null);
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

  function splitBefore(index: number) {
    commit(splitSegmentAt(history.present, index));
    setSelected(null);
  }

  // Starts a new line at the open word (the typed correction is kept).
  function splitAtSelected() {
    if (selected === null) return;
    const edited = editWord(history.present, selected, editText) ?? history.present;
    commit(splitSegmentAt(edited, selected) ?? (edited === history.present ? null : edited));
    setSelected(null);
  }

  const baseName = title.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60) || "transcript";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {t("detectedLanguage", { language: languageName ?? transcript.language })}
          {transcript.language_confidence !== null
            ? ` · ${Math.round(transcript.language_confidence * 100)} %`
            : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {isEdited ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving || dirty}
              onClick={() => setRevertOpen(true)}
            >
              <RotateCcw aria-hidden="true" />
              {t("edit.revert")}
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={copyText}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? t("copied") : t("copy")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => download(`${baseName}.srt`, toSrt(segments), "application/x-subrip")}
          >
            <Download aria-hidden="true" />
            SRT
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => download(`${baseName}.txt`, toPlainText(segments), "text/plain")}
          >
            <Download aria-hidden="true" />
            TXT
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchBar
          find={find}
          onFind={changeFind}
          matchCount={matchIndices.length}
          onToggleReplace={toggleReplace}
          onNext={nextMatch}
        />
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={t("edit.undo")}
            title={t("edit.undo")}
            disabled={history.past.length === 0}
            onClick={undo}
          >
            <Undo2 aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={t("edit.redo")}
            title={t("edit.redo")}
            disabled={history.future.length === 0}
            onClick={redo}
          >
            <Redo2 aria-hidden="true" />
          </Button>
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

      {/* Always rendered (even when empty) so the text below does not jump when the status appears. */}
      <div className="flex min-h-6 flex-wrap items-center gap-x-4 gap-y-1" aria-live="polite">
        {saveState === "error" ? (
          <p className="text-danger flex items-center gap-2 text-sm">
            <CircleAlert className="size-4" aria-hidden="true" />
            {t("edit.saveFailed")}
            <Button type="button" variant="outline" size="sm" onClick={save}>
              {t("edit.retry")}
            </Button>
          </p>
        ) : dirty || saving ? (
          <p className="text-text-2 flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("edit.saving")}
          </p>
        ) : saveState === "saved" ? (
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

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-text-3 text-sm">{t("edit.hint")}</p>
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

      <div
        ref={container}
        // Extra room on top and between lines: the icons above a word never hide the line above it.
        className="bg-card relative flex max-h-[60vh] flex-col gap-4 overflow-x-hidden overflow-y-auto rounded-xl border p-4 pt-9"
      >
        {segments.map((segment, segmentIndex) => (
          <div
            key={segment.word_start}
            data-segment-index={segmentIndex}
            className="group flex gap-3 leading-8"
          >
            <button
              type="button"
              onClick={() => seek(segment.start)}
              className="text-muted-foreground hover:text-foreground w-12 shrink-0 text-end text-xs tabular-nums"
              aria-label={t("jumpTo", { time: formatTimestamp(segment.start) })}
            >
              {formatTimestamp(segment.start)}
            </button>
            <div className="min-w-0 flex-1">
              <p className="break-words">
                {words.slice(segment.word_start, segment.word_end + 1).map((word, offset) => {
                  const index = segment.word_start + offset;
                  return (
                    <span key={index}>
                      {index === selected ? (
                        <span className="relative">
                          <InlineWordEditor
                            value={editText}
                            onChange={setEditText}
                            canSplit={index > segment.word_start}
                            onCommit={commitWord}
                            onSplit={splitAtSelected}
                            onDelete={removeWord}
                            onCancel={() => setSelected(null)}
                          />
                          <WordActions
                            keepFocus
                            canSplit={index > segment.word_start}
                            onDelete={removeWord}
                            onSplit={splitAtSelected}
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
                          canSplit={index > segment.word_start}
                          doubtLabel={t("doubtful", {
                            percent: Math.round((word.confidence ?? 0) * 100),
                          })}
                          onOpen={openWord}
                          onDelete={deleteAt}
                          onSplit={splitBefore}
                        />
                      )}{" "}
                    </span>
                  );
                })}
              </p>
            </div>
            {segmentIndex > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                title={t("edit.merge")}
                aria-label={t("edit.merge")}
                onClick={() => {
                  commit(mergeWithPrevious(history.present, segmentIndex));
                  setSelected(null);
                }}
              >
                <Merge aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        ))}
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
