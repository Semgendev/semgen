import { describe, expect, it } from "vitest";

import { paginate } from "@/features/captions/paginate";
import { CAPTION_PRESETS, DEFAULT_PRESET } from "@/features/captions/presets";
import { exportCaptions, exportPropsSchema } from "@/features/captions/remotion/export-props";

const words = ["Bonjour", "tout", "le", "monde,", "voici", "un", "test."].map((text, index) => ({
  text,
  start: index * 400,
  end: index * 400 + 350,
  confidence: 0.9,
  speaker: null,
}));

const props = {
  videoSrc: "https://example.com/video.mp4",
  words,
  captionStyle: { preset: "cinema" },
  width: 1080,
  height: 1920,
  durationS: 12,
};

describe("caption export", () => {
  it("accepts the raw data of a project", () => {
    expect(exportPropsSchema.safeParse(props).success).toBe(true);
  });

  it("refuses a missing video, a wrong size or an endless video", () => {
    expect(exportPropsSchema.safeParse({ ...props, videoSrc: "" }).success).toBe(false);
    expect(exportPropsSchema.safeParse({ ...props, width: 0 }).success).toBe(false);
    expect(exportPropsSchema.safeParse({ ...props, durationS: 4 * 60 * 60 }).success).toBe(false);
  });

  it("cuts the captions like the preview, with the chosen style", () => {
    const { style, pages } = exportCaptions(props);
    expect(style.base.font).toBe(CAPTION_PRESETS.cinema.base.font);
    expect(pages).toEqual(paginate(words, style, "cinema"));
  });

  it("only keeps the moves of the chosen style", () => {
    const moved = { all: { "line-0": { x: 5, y: -3 } } };
    const { moves } = exportCaptions({
      words,
      captionStyle: { preset: "cinema", moves: { cinema: moved, minimal: {} } },
    });
    expect(moves).toEqual(moved);
  });

  it("falls back on the default style when the stored one is broken", () => {
    const { style } = exportCaptions({ words, captionStyle: { preset: "nope" } });
    expect(style.base.font).toBe(CAPTION_PRESETS[DEFAULT_PRESET].base.font);
  });
});
