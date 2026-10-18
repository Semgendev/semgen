"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import type { TranscriptWord } from "../transcription/types";

// The words shown as captions. The transcript editor publishes every correction here, so the
// captions on the video change at once, before the automatic save even happens.
type CaptionWordsApi = { words: TranscriptWord[]; setWords: (words: TranscriptWord[]) => void };

const CaptionWordsContext = createContext<CaptionWordsApi | null>(null);

export function CaptionWordsProvider({
  initialWords,
  children,
}: {
  initialWords: TranscriptWord[];
  children: ReactNode;
}) {
  const [words, setWords] = useState(initialWords);
  return (
    <CaptionWordsContext.Provider value={{ words, setWords }}>
      {children}
    </CaptionWordsContext.Provider>
  );
}

const EMPTY: TranscriptWord[] = [];

export function useCaptionWords(): TranscriptWord[] {
  return useContext(CaptionWordsContext)?.words ?? EMPTY;
}

export function usePublishCaptionWords(): ((words: TranscriptWord[]) => void) | null {
  return useContext(CaptionWordsContext)?.setWords ?? null;
}
