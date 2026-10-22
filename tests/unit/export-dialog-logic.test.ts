import { describe, expect, it } from "vitest";

import { fitMatters, qualityState } from "@/features/export/options";

const hd = { width: 1920, height: 1080 };
const uhd = { width: 3840, height: 2160 };

describe("fitMatters", () => {
  it("is false for the original format and for the same shape", () => {
    expect(fitMatters("original", hd)).toBe(false);
    expect(fitMatters("16:9", hd)).toBe(false);
    expect(fitMatters("16:9", { width: 1280, height: 720 })).toBe(false);
  });

  it("is true when the frame has another shape than the video", () => {
    expect(fitMatters("9:16", hd)).toBe(true);
    expect(fitMatters("1:1", hd)).toBe(true);
    expect(fitMatters("16:9", { width: 1080, height: 1920 })).toBe(true);
  });
});

describe("qualityState", () => {
  it("always allows 720p and 1080p", () => {
    expect(qualityState("720p", hd, 60, 0)).toBe("ok");
    expect(qualityState("1080p", hd, 60, 0)).toBe("ok");
  });

  it("refuses 4K from a smaller source", () => {
    expect(qualityState("4k", hd, 60, 100)).toBe("no_4k_source");
  });

  it("refuses 4K without enough credits (1 per started minute)", () => {
    expect(qualityState("4k", uhd, 61, 1)).toBe("not_enough_credits");
    expect(qualityState("4k", uhd, 61, 2)).toBe("ok");
  });
});
