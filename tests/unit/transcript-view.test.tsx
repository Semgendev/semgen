import { cleanup, render, screen, within } from "@testing-library/react";
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
        <TranscriptView
          transcript={transcript}
          title="My video"
          projectId="3f1c2a9e-5b7d-4e21-8a43-9c0d6b1e7f52"
        />
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

  it("moves the video to the clicked word, pauses it and opens the word for correction", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    const { container } = renderView();
    const video = container.querySelector("video");

    await userEvent.click(screen.getByRole("button", { name: "Allez" }));

    expect(video?.currentTime).toBe(5);
    expect(play).not.toHaveBeenCalled();
    expect(pause).toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Word to fix" })).toHaveValue("Allez");
    play.mockRestore();
    pause.mockRestore();
  });

  it("plays from a line when its timestamp is clicked", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const { container } = renderView();
    const video = container.querySelector("video");

    await userEvent.click(screen.getByRole("button", { name: "Jump to 0:05" }));

    expect(video?.currentTime).toBe(5);
    expect(play).toHaveBeenCalled();
    play.mockRestore();
  });

  it("corrects a word in place with Enter", async () => {
    renderView();
    await userEvent.click(screen.getByRole("button", { name: "Allez" }));
    const field = screen.getByRole("textbox", { name: "Word to fix" });
    await userEvent.clear(field);
    await userEvent.type(field, "Allons{Enter}");

    expect(screen.queryByRole("textbox", { name: "Word to fix" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Allons" })).toBeInTheDocument();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("highlights search results and shows the count", async () => {
    renderView();
    await userEvent.type(screen.getByRole("searchbox", { name: "Search for a word" }), "all");
    expect(screen.getByText("1 result")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Allez" }).className).toContain("bg-spark");
  });

  it("opens a small floating replace panel, explains what is missing, then replaces and closes", async () => {
    renderView();
    await userEvent.click(screen.getByRole("button", { name: "Replace a word" }));
    expect(screen.getByRole("heading", { name: "Replace a word" })).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: "Find a word" }), "a");

    // No replacement typed yet: the button is clickable and says what is missing.
    await userEvent.click(screen.getByRole("button", { name: "Replace all" }));
    expect(screen.getByText("Type what to replace the word with.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Replace with" })).toHaveFocus();

    // The page behind stays usable and readable (no modal): the words are still reachable.
    expect(screen.getByRole("button", { name: "Salut" })).toBeInTheDocument();

    await userEvent.type(screen.getByRole("textbox", { name: "Replace with" }), "x");
    await userEvent.click(screen.getByRole("button", { name: "Replace all" }));

    // The panel closes by itself and the words are replaced.
    expect(screen.queryByRole("textbox", { name: "Replace with" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sxlut" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clxude." })).toBeInTheDocument();
    expect(screen.getByText("3 replacements")).toBeInTheDocument();
  });

  it("closes the replace panel with the cross and keeps the search bar independent", async () => {
    renderView();
    await userEvent.type(screen.getByRole("searchbox", { name: "Search for a word" }), "allez");
    await userEvent.click(screen.getByRole("button", { name: "Replace a word" }));
    // The replace panel starts empty: it does not reuse what is typed in the search bar.
    expect(screen.getByRole("textbox", { name: "Find a word" })).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("textbox", { name: "Find a word" })).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search for a word" })).toHaveValue("allez");
  });

  it("deletes a word with the icon that floats above it", async () => {
    renderView();
    expect(screen.getAllByRole("button", { name: /^Jump to/ })).toHaveLength(2);
    const cell = screen.getByRole("button", { name: "Claude." }).closest("span");
    await userEvent.click(
      within(cell as HTMLElement).getByRole("button", { name: "Delete this word" }),
    );
    expect(screen.queryByRole("button", { name: "Claude." })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salut" })).toBeInTheDocument();
  });

  it("starts a new line with Shift+Enter", async () => {
    renderView();
    await userEvent.click(screen.getByRole("button", { name: "Claude." }));
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}");
    expect(screen.getAllByRole("button", { name: /^Jump to/ })).toHaveLength(3);
  });

  it("toggles play/pause with Enter or Space when no field has the focus", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    renderView();

    await userEvent.keyboard("{Enter}");
    expect(play).toHaveBeenCalledTimes(1);

    // Typing in the search field must not toggle the video.
    await userEvent.click(screen.getByRole("searchbox", { name: "Search for a word" }));
    await userEvent.keyboard("a b{Enter}");
    expect(play).toHaveBeenCalledTimes(1);
    expect(pause).not.toHaveBeenCalled();
    play.mockRestore();
    pause.mockRestore();
  });

  it("offers copy and downloads", () => {
    renderView();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SRT" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "TXT" })).toBeInTheDocument();
  });
});
