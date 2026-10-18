import { describe, expect, it } from "vitest";

import {
  findActiveWordIndex,
  findSegmentIndex,
  formatTimestamp,
  isLowConfidence,
  toPlainText,
  toSrt,
  transcriptionStep,
} from "@/features/transcription/view";

const words = [
  { start: 1000, end: 1400 },
  { start: 1500, end: 1900 },
  { start: 5000, end: 5400 },
];

describe("isLowConfidence", () => {
  it("flags only known low scores", () => {
    expect(isLowConfidence({ confidence: 0.4 })).toBe(true);
    expect(isLowConfidence({ confidence: 0.6 })).toBe(false);
    expect(isLowConfidence({ confidence: null })).toBe(false);
  });
});

describe("findActiveWordIndex", () => {
  it("returns -1 before the first word and after a long silence", () => {
    expect(findActiveWordIndex(words, 500)).toBe(-1);
    expect(findActiveWordIndex(words, 3500)).toBe(-1);
    expect(findActiveWordIndex([], 1000)).toBe(-1);
  });

  it("follows the word being spoken, keeping it lit through short gaps", () => {
    expect(findActiveWordIndex(words, 1000)).toBe(0);
    expect(findActiveWordIndex(words, 1450)).toBe(0);
    expect(findActiveWordIndex(words, 1600)).toBe(1);
    expect(findActiveWordIndex(words, 5100)).toBe(2);
  });
});

describe("findSegmentIndex", () => {
  it("finds the segment containing a word", () => {
    const segments = [
      { word_start: 0, word_end: 1 },
      { word_start: 2, word_end: 2 },
    ];
    expect(findSegmentIndex(segments, 1)).toBe(0);
    expect(findSegmentIndex(segments, 2)).toBe(1);
    expect(findSegmentIndex(segments, -1)).toBe(-1);
  });
});

describe("formatTimestamp", () => {
  it("formats m:ss and h:mm:ss", () => {
    expect(formatTimestamp(0)).toBe("0:00");
    expect(formatTimestamp(65_400)).toBe("1:05");
    expect(formatTimestamp(3_725_000)).toBe("1:02:05");
  });
});

describe("exports", () => {
  const segments = [
    { start: 1000, end: 2500, text: "Salut Claude." },
    { start: 3_661_005, end: 3_662_000, text: "Allez, go !" },
  ];

  it("builds a valid SRT file", () => {
    expect(toSrt(segments)).toBe(
      "1\n00:00:01,000 --> 00:00:02,500\nSalut Claude.\n\n" +
        "2\n01:01:01,005 --> 01:01:02,000\nAllez, go !\n",
    );
  });

  it("builds plain text, one segment per line", () => {
    expect(toPlainText(segments)).toBe("Salut Claude.\nAllez, go !");
  });
});

describe("transcriptionStep", () => {
  it("maps job progress to user-facing steps", () => {
    expect(transcriptionStep("queued", 0)).toBe("queued");
    expect(transcriptionStep("running", 5)).toBe("checking");
    expect(transcriptionStep("running", 15)).toBe("preparing");
    expect(transcriptionStep("running", 28)).toBe("transcribing");
  });
});
