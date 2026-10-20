"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { TranscriptWord } from "../transcription/types";
import { DEFAULT_PRESET, type PresetId } from "./presets";

// The words shown as captions. The transcript editor publishes every correction here, so the
// captions on the video change at once, before the automatic save even happens.
// The chosen style travels the other way: the transcript tab cuts the text like the video does.
// (Only the style decides the cuts: colours, fonts and other adjustments never change them.)
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
    }),
    [words, presetId, transcriptVisible, lostMoves],
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
