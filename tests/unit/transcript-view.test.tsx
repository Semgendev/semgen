import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "../../messages/en.json";
import { PlayerProvider, VideoPlayer } from "@/features/projects/player";
import type { Transcript } from "@/features/transcription/queries";
import { TranscriptView } from "@/features/transcription/transcript-view";

const transcript: Transcript = {
  id: "b28f9644-c3c7-4a31-8225-017f8b8bad2a",
  language: "fr",
  language_confidence: 0.83,
  provider: "assemblyai",
  words: [
    { text: "Salut", start: 1000, end: 1400, confidence: 0.98, speaker: null },
    { text: "Claude.", start: 1500, end: 1900, confidence: 0.4, speaker: null },
    { text: "Allez", start: 5000, end: 5400, confidence: 0.95, speaker: null },
  ],
  segments: [
    { start: 1000, end: 1900, text: "Salut Claude.", speaker: null, word_start: 0, word_end: 1 },
    { start: 5000, end: 5400, text: "Allez", speaker: null, word_start: 2, word_end: 2 },
  ],
};

function renderView() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PlayerProvider>
        <VideoPlayer src="https://example.com/video.mp4" fallback="no video" />
        <TranscriptView transcript={transcript} title="My video" />
      </PlayerProvider>
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe("TranscriptView", () => {
  it("shows the detected language, every word and the doubtful ones", () => {
    renderView();
    expect(screen.getByText(/Detected language: French/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salut" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Claude." })).toHaveAttribute(
      "title",
      "Doubtful word (40% confidence)",
    );
    expect(screen.getByRole("button", { name: "Salut" })).not.toHaveAttribute("title");
    expect(screen.getByLabelText("Underline doubtful words (1)")).toBeChecked();
  });

  it("moves the video to the clicked word", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const { container } = renderView();
    const video = container.querySelector("video");

    await userEvent.click(screen.getByRole("button", { name: "Allez" }));

    expect(video?.currentTime).toBe(5);
    expect(play).toHaveBeenCalled();
    play.mockRestore();
  });

  it("offers copy and downloads", () => {
    renderView();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SRT" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "TXT" })).toBeInTheDocument();
  });
});
