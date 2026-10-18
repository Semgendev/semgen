import { describe, expect, it } from "vitest";

import { parseFfprobeOutput } from "@/features/media/probe";
import {
  buildSegments,
  chooseTranscriptionProvider,
  transcriptionCost,
} from "@/features/transcription/logic";
import { mapAssemblyAiTranscript } from "@/features/transcription/providers/assemblyai";
import type { TranscriptWord } from "@/features/transcription/types";

describe("transcriptionCost", () => {
  it("charges one credit per started minute, at least one", () => {
    expect(transcriptionCost(0.5)).toBe(1);
    expect(transcriptionCost(60)).toBe(1);
    expect(transcriptionCost(61)).toBe(2);
    expect(transcriptionCost(180)).toBe(3);
  });
});

describe("chooseTranscriptionProvider", () => {
  it("uses AssemblyAI by default and for automatic detection", () => {
    expect(chooseTranscriptionProvider(null, true)).toBe("assemblyai");
    expect(chooseTranscriptionProvider("fr", true)).toBe("assemblyai");
  });

  it("uses Scribe for languages it handles better, only when configured", () => {
    expect(chooseTranscriptionProvider("sw", true)).toBe("elevenlabs");
    expect(chooseTranscriptionProvider("ha", true)).toBe("elevenlabs");
    expect(chooseTranscriptionProvider("sw", false)).toBe("assemblyai");
  });
});

describe("parseFfprobeOutput", () => {
  it("reads duration, audio presence, size and frame rate", () => {
    const info = parseFfprobeOutput({
      streams: [
        { codec_type: "video", width: 1080, height: 1920, avg_frame_rate: "30000/1001" },
        { codec_type: "audio" },
      ],
      format: { duration: "42.5321" },
    });
    expect(info).toEqual({
      durationSeconds: 42.532,
      hasAudio: true,
      width: 1080,
      height: 1920,
      fps: 29.97,
    });
  });

  it("detects silent videos and rejects unreadable durations", () => {
    const silent = parseFfprobeOutput({
      streams: [{ codec_type: "video", width: 640, height: 360, r_frame_rate: "25/1" }],
      format: { duration: "5" },
    });
    expect(silent.hasAudio).toBe(false);
    expect(silent.fps).toBe(25);
    expect(() => parseFfprobeOutput({ streams: [], format: {} })).toThrow("unreadable_duration");
  });
});

describe("mapAssemblyAiTranscript", () => {
  it("keeps processing states as processing", () => {
    expect(mapAssemblyAiTranscript({ id: "t1", status: "queued" })).toEqual({
      state: "processing",
    });
  });

  it("maps a completed transcript with detected language", () => {
    const status = mapAssemblyAiTranscript({
      id: "t1",
      status: "completed",
      text: "Bonjour à tous.",
      language_code: "fr",
      language_confidence: 0.97,
      words: [
        { text: "Bonjour", start: 120, end: 480, confidence: 0.99, speaker: "A" },
        { text: "à", start: 500, end: 560, confidence: 0.6, speaker: "A" },
        { text: "tous.", start: 580, end: 900, confidence: 0.95, speaker: "A" },
      ],
    });
    expect(status.state).toBe("completed");
    if (status.state !== "completed") return;
    expect(status.result.language).toBe("fr");
    expect(status.result.languageConfidence).toBe(0.97);
    expect(status.result.words).toHaveLength(3);
    expect(status.result.words[1]).toEqual({
      text: "à",
      start: 500,
      end: 560,
      confidence: 0.6,
      speaker: "A",
    });
  });

  it("normalises regional language codes and reports provider errors", () => {
    const status = mapAssemblyAiTranscript({
      id: "t1",
      status: "completed",
      language_code: "en_us",
      words: [],
    });
    expect(status.state === "completed" && status.result.language).toBe("en");
    expect(mapAssemblyAiTranscript({ id: "t1", status: "error", error: "bad audio" })).toEqual({
      state: "failed",
      reason: "bad audio",
    });
  });

  it("rejects malformed provider responses", () => {
    expect(() => mapAssemblyAiTranscript({ status: "completed" })).toThrow();
  });
});

describe("buildSegments", () => {
  const word = (text: string, start: number, end: number, speaker = "A"): TranscriptWord => ({
    text,
    start,
    end,
    confidence: 0.9,
    speaker,
  });

  it("splits on sentence ends, speaker changes and long pauses", () => {
    const segments = buildSegments([
      word("Hello", 0, 300),
      word("everyone.", 320, 700),
      word("Welcome", 750, 1000),
      word("back", 1020, 1300),
      word("Thanks", 1400, 1700, "B"),
      word("again", 3000, 3300, "B"),
    ]);
    expect(segments.map((segment) => segment.text)).toEqual([
      "Hello everyone.",
      "Welcome back",
      "Thanks",
      "again",
    ]);
    expect(segments[0]).toMatchObject({ start: 0, end: 700, word_start: 0, word_end: 1 });
    expect(segments[2]?.speaker).toBe("B");
  });

  it("caps very long lines", () => {
    const words = Array.from({ length: 30 }, (_, index) =>
      word(`w${index}`, index * 100, index * 100 + 90),
    );
    const segments = buildSegments(words);
    expect(segments.every((segment) => segment.word_end - segment.word_start < 14)).toBe(true);
    expect(segments.at(-1)?.word_end).toBe(29);
  });
});
