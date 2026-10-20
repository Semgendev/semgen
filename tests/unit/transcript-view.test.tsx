import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "../../messages/en.json";
import { PlayerProvider, VideoPlayer } from "@/features/projects/player";
import type { Transcript } from "@/features/transcription/queries";
import { revertTranscript, saveTranscript } from "@/features/transcription/actions";
import { TranscriptView } from "@/features/transcription/transcript-view";

// Saving talks to the server: replaced by a fake that always succeeds.
vi.mock("@/features/transcription/actions", () => ({
  saveTranscript: vi.fn().mockResolvedValue({ ok: true }),
  revertTranscript: vi.fn(),
  startTranscription: vi.fn(),
}));

const transcript: Transcript = {
  id: "b28f9644-c3c7-4a31-8225-017f8b8bad2a",
  language: "fr",
  language_confidence: 0.83,
  provider: "assemblyai",
  is_edited: false,
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

function renderView(override: Partial<Transcript> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PlayerProvider>
        <VideoPlayer src="https://example.com/video.mp4" fallback="no video" />
        <TranscriptView
          transcript={{ ...transcript, ...override }}
          title="My video"
          projectId="3f1c2a9e-5b7d-4e21-8a43-9c0d6b1e7f52"
        />
      </PlayerProvider>
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.mocked(saveTranscript).mockClear();
});

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
    // No Save button: the change is saved by itself (spinner first, then "Saved").
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    expect(await screen.findByText("Saved", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(saveTranscript).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveTranscript).mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining([expect.objectContaining({ text: "Allons" })]),
    );
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("shows a clear error with a Try again button when saving fails", async () => {
    vi.mocked(saveTranscript).mockResolvedValueOnce({ ok: false, code: "unknown" });
    renderView();
    await userEvent.click(screen.getByRole("button", { name: "Allez" }));
    await userEvent.keyboard("Allons{Enter}");
    expect(
      await screen.findByText("Saving failed. Please try again.", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Saved", {}, { timeout: 3000 })).toBeInTheDocument();
  });

  // The search is an icon: the field opens in front of the lines when it is tapped.
  async function openSearch() {
    const open = screen.queryByRole("searchbox", { name: "Search for a word" });
    if (!open) {
      await userEvent.click(screen.getByRole("button", { name: "Search for a word" }));
    }
    return screen.getByRole("searchbox", { name: "Search for a word" });
  }

  it("highlights search results and shows the count", async () => {
    renderView();
    await userEvent.type(await openSearch(), "all");
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
    // Reopening after a replacement: both fields are empty again.    await userEvent.click(screen.getByRole("button", { name: "Replace a word" }));    expect(screen.getByRole("textbox", { name: "Find a word" })).toHaveValue("");    expect(screen.getByRole("textbox", { name: "Replace with" })).toHaveValue("");
  });

  it("marks the first result while typing and empties the search when a word is touched", async () => {
    renderView();
    await userEvent.type(await openSearch(), "all");
    expect(screen.getByRole("button", { name: "Allez" }).className).toContain("ring-brand");
    await userEvent.click(screen.getByRole("button", { name: "Allez" }));
    expect(
      screen.getByRole("button", { name: "Search for a word", expanded: false }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Search for a word" }));
    expect(screen.getByRole("searchbox", { name: "Search for a word" })).toHaveValue("");
  });

  it("closes the replace panel with the cross and keeps the search bar independent", async () => {
    renderView();
    await userEvent.type(await openSearch(), "allez");
    await userEvent.click(screen.getByRole("button", { name: "Replace a word" }));
    // The replace panel starts empty: it does not reuse what is typed in the search bar.
    expect(screen.getByRole("textbox", { name: "Find a word" })).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("textbox", { name: "Find a word" })).not.toBeInTheDocument();
    // the search field closed when the replace panel was used; its word is still there
    expect(await openSearch()).toHaveValue("allez");
  });

  it("keeps the typed words when the panel is closed without replacing", async () => {
    renderView();
    await userEvent.click(screen.getByRole("button", { name: "Replace a word" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Find a word" }), "salut");
    await userEvent.type(screen.getByRole("textbox", { name: "Replace with" }), "bonjour");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    await userEvent.click(screen.getByRole("button", { name: "Replace a word" }));
    expect(screen.getByRole("textbox", { name: "Find a word" })).toHaveValue("salut");
    expect(screen.getByRole("textbox", { name: "Replace with" })).toHaveValue("bonjour");
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
    await userEvent.click(await openSearch());
    await userEvent.keyboard("a b{Enter}");
    expect(play).toHaveBeenCalledTimes(1);
    expect(pause).not.toHaveBeenCalled();
    play.mockRestore();
    pause.mockRestore();
  });

  it("offers to go back to the original text only once something was saved", async () => {
    const { unmount } = renderView();
    expect(screen.queryByRole("button", { name: "Back to the original text" })).toBeNull();
    unmount();
    renderView({ is_edited: true });
    expect(screen.getByRole("button", { name: "Back to the original text" })).toBeEnabled();
  });

  it("asks for confirmation, then puts the original text back", async () => {
    vi.mocked(revertTranscript).mockResolvedValueOnce({
      ok: true,
      words: [{ text: "Original", start: 0, end: 500, confidence: 0.9, speaker: null }],
      segments: [
        { start: 0, end: 500, text: "Original", speaker: null, word_start: 0, word_end: 0 },
      ],
    });
    renderView({ is_edited: true });

    await userEvent.click(screen.getByRole("button", { name: "Back to the original text" }));
    expect(screen.getByText("Go back to the original text?")).toBeInTheDocument();
    expect(revertTranscript).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Restore the original text" }));
    expect(await screen.findByText("Original text restored.")).toBeInTheDocument();
    expect(revertTranscript).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Original" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salut" })).not.toBeInTheDocument();
    // The original is back: nothing left to restore, and nothing to save.
    expect(screen.queryByRole("button", { name: "Back to the original text" })).toBeNull();
  });

  it("shows an error and keeps the corrections when going back fails", async () => {
    vi.mocked(revertTranscript).mockResolvedValueOnce({ ok: false, code: "unknown" });
    renderView({ is_edited: true });
    await userEvent.click(screen.getByRole("button", { name: "Back to the original text" }));
    await userEvent.click(screen.getByRole("button", { name: "Restore the original text" }));
    expect(
      await screen.findByText("Could not restore the original text. Please try again."),
    ).toBeInTheDocument();
  });

  it("offers copy and downloads", () => {
    renderView();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SRT" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "TXT" })).toBeInTheDocument();
  });
});
