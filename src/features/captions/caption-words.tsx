"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { TranscriptWord } from "../transcription/types";
import { DEFAULT_PRESET, type PresetId } from "./presets";

// What the video side (the caption studio) and the transcript tab share.
//
// The words shown as captions: the transcript editor publishes every correction here, so the
// captions on the video change at once, before the automatic save even happens.
// The chosen style travels the other way: the transcript tab cuts the text like the video does.
// (Only the style decides the cuts: colours, fonts and other adjustments never change them.)

// A request about one caption block, from one side to the other. firstWord = index of the first word
// of the block in the transcript. The video side answers "select" (the icon of a line), "merge" and
// "toggle-hidden" (the eye of a line); the transcript side answers "delete", "delete-text" and
// "delete-emphasis" (it owns the words).
export type BlockRequestKind =
  | "select"
  | "clear"
  | "reset-moves"
  | "delete"
  | "merge"
  | "toggle-hidden"
  | "delete-text"
  | "delete-emphasis";
export type BlockRequest = { id: number; kind: BlockRequestKind; firstWord: number };

// The blocks of the chosen style that are split in two parts or hidden on the video, by the index of
// their first word (the transcript list shows the eye and the "merge" icon from it).
export type SplitBlocks = Record<number, { split: boolean; hidden: boolean }>;

export type SaveState = "idle" | "saving" | "saved" | "error";

// Undo / redo and saving of the moves belong to the video side, while the buttons are on the
// transcript side: one object that both sides plug into.
export type MovesBridge = {
  // the video side plugs its handlers in; the transcript side calls undo / redo / retry
  setHandlers: (handlers: { undo: () => void; redo: () => void; retry: () => void }) => void;
  undo: () => void;
  redo: () => void;
  retry: () => void;
  // told by the video side at every undoable change of the moves; the transcript side listens
  changed: () => void;
  onChange: (listener: (() => void) | null) => void;
};

function createMovesBridge(): MovesBridge {
  let handlers: { undo: () => void; redo: () => void; retry: () => void } | null = null;
  let listener: (() => void) | null = null;
  return {
    setHandlers: (next) => {
      handlers = next;
    },
    undo: () => handlers?.undo(),
    redo: () => handlers?.redo(),
    retry: () => handlers?.retry(),
    changed: () => listener?.(),
    onChange: (next) => {
      listener = next;
    },
  };
}

type CaptionWordsApi = {
  words: TranscriptWord[];
  setWords: (words: TranscriptWord[]) => void;
  presetId: PresetId;
  setPresetId: (presetId: PresetId) => void;
  // false while the transcript tab is hidden behind the styles (it then stops following the video)
  transcriptVisible: boolean;
  setTranscriptVisible: (visible: boolean) => void;
  // how many moved blocks of the chosen style have lost their place (a cut added or taken away, or
  // the first word of the block deleted): the transcript tab says so in its notice
  lostMoves: { presetId: PresetId; count: number };
  setLostMoves: (lost: { presetId: PresetId; count: number }) => void;
  blockRequest: BlockRequest | null;
  requestBlock: (kind: BlockRequestKind, firstWord: number) => void;
  splitBlocks: SplitBlocks;
  setSplitBlocks: (blocks: SplitBlocks) => void;
  movesBridge: MovesBridge;
  movesSave: SaveState;
  setMovesSave: (state: SaveState) => void;
  // first word of the block being moved on the video (its line is tinted in the transcript list)
  pickedBlock: number | null;
  setPickedBlock: (firstWord: number | null) => void;
};

const CaptionWordsContext = createContext<CaptionWordsApi | null>(null);

export function CaptionWordsProvider({
  initialWords,
  initialPresetId,
  children,
}: {
  initialWords: TranscriptWord[];
  initialPresetId: PresetId;
  children: ReactNode;
}) {
  const [words, setWords] = useState(initialWords);
  const [presetId, setPresetId] = useState(initialPresetId);
  const [transcriptVisible, setTranscriptVisible] = useState(true);
  const [lostMoves, setLostMoves] = useState({ presetId: initialPresetId, count: 0 });
  const [blockRequest, setBlockRequest] = useState<BlockRequest | null>(null);
  const [splitBlocks, setSplitBlocks] = useState<SplitBlocks>({});
  const [movesBridge] = useState<MovesBridge>(createMovesBridge);
  const [movesSave, setMovesSave] = useState<SaveState>("idle");
  const [pickedBlock, setPickedBlock] = useState<number | null>(null);
  const requestBlock = useCallback((kind: BlockRequestKind, firstWord: number) => {
    setBlockRequest((last) => ({ id: (last?.id ?? 0) + 1, kind, firstWord }));
  }, []);
  const value = useMemo(
    () => ({
      words,
      setWords,
      presetId,
      setPresetId,
      transcriptVisible,
      setTranscriptVisible,
      lostMoves,
      setLostMoves,
      blockRequest,
      requestBlock,
      splitBlocks,
      setSplitBlocks,
      movesBridge,
      movesSave,
      setMovesSave,
      pickedBlock,
      setPickedBlock,
    }),
    [
      pickedBlock,
      words,
      presetId,
      transcriptVisible,
      lostMoves,
      blockRequest,
      requestBlock,
      splitBlocks,
      movesBridge,
      movesSave,
    ],
  );
  return <CaptionWordsContext.Provider value={value}>{children}</CaptionWordsContext.Provider>;
}

const EMPTY: TranscriptWord[] = [];

export function useCaptionWords(): TranscriptWord[] {
  return useContext(CaptionWordsContext)?.words ?? EMPTY;
}

export function usePublishCaptionWords(): ((words: TranscriptWord[]) => void) | null {
  return useContext(CaptionWordsContext)?.setWords ?? null;
}

export function useCaptionPresetId(): PresetId {
  return useContext(CaptionWordsContext)?.presetId ?? DEFAULT_PRESET;
}

export function usePublishCaptionPresetId(): ((presetId: PresetId) => void) | null {
  return useContext(CaptionWordsContext)?.setPresetId ?? null;
}

export function useTranscriptVisible(): boolean {
  return useContext(CaptionWordsContext)?.transcriptVisible ?? true;
}

export function useBlockRequest(): BlockRequest | null {
  return useContext(CaptionWordsContext)?.blockRequest ?? null;
}

export function useRequestBlock(): CaptionWordsApi["requestBlock"] | null {
  return useContext(CaptionWordsContext)?.requestBlock ?? null;
}

const NO_SPLIT: SplitBlocks = {};

export function useSplitBlocks(): SplitBlocks {
  return useContext(CaptionWordsContext)?.splitBlocks ?? NO_SPLIT;
}

export function usePublishSplitBlocks(): ((blocks: SplitBlocks) => void) | null {
  return useContext(CaptionWordsContext)?.setSplitBlocks ?? null;
}

export function usePickedBlock(): number | null {
  return useContext(CaptionWordsContext)?.pickedBlock ?? null;
}

export function usePublishPickedBlock(): ((firstWord: number | null) => void) | null {
  return useContext(CaptionWordsContext)?.setPickedBlock ?? null;
}

const NO_BRIDGE = createMovesBridge();

export function useMovesBridge(): MovesBridge {
  return useContext(CaptionWordsContext)?.movesBridge ?? NO_BRIDGE;
}

export function useMovesSave(): SaveState {
  return useContext(CaptionWordsContext)?.movesSave ?? "idle";
}

export function usePublishMovesSave(): ((state: SaveState) => void) | null {
  return useContext(CaptionWordsContext)?.setMovesSave ?? null;
}

const NO_LOST = { presetId: DEFAULT_PRESET, count: 0 };

export function useLostMoves(): { presetId: PresetId; count: number } {
  return useContext(CaptionWordsContext)?.lostMoves ?? NO_LOST;
}

export function usePublishLostMoves():
  ((lost: { presetId: PresetId; count: number }) => void) | null {
  return useContext(CaptionWordsContext)?.setLostMoves ?? null;
}

export function usePublishTranscriptVisible(): ((visible: boolean) => void) | null {
  return useContext(CaptionWordsContext)?.setTranscriptVisible ?? null;
}
