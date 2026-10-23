import { describe, expect, it } from "vitest";

import { planAllows } from "@/features/billing/plans";
import { estimateSizeMb, fitMatters, qualityState } from "@/features/export/options";

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
    expect(qualityState("720p", hd, "free")).toBe("ok");
    expect(qualityState("1080p", hd, "free")).toBe("ok");
  });

  it("refuses 4K from a smaller source, whatever the plan (never sold as an upgrade)", () => {
    expect(qualityState("4k", hd, "free")).toBe("no_4k_source");
    expect(qualityState("4k", hd, "business")).toBe("no_4k_source");
  });

  it("keeps 4K from a 4K source for the Business plan", () => {
    expect(qualityState("4k", uhd, "free")).toBe("locked");
    expect(qualityState("4k", uhd, "pro")).toBe("locked");
    expect(qualityState("4k", uhd, "business")).toBe("ok");
  });
});

describe("planAllows", () => {
  it("gives 4K and 60 images per second to Business only", () => {
    for (const plan of ["free", "starter", "pro"] as const) {
      expect(planAllows(plan, "4k")).toBe(false);
      expect(planAllows(plan, "60fps")).toBe(false);
    }
    expect(planAllows("business", "4k")).toBe(true);
    expect(planAllows("business", "60fps")).toBe(true);
  });
});

describe("estimateSizeMb", () => {
  it("matches the measured 41 MB for a minute in 1080×1920 at 30 images per second", () => {
    expect(estimateSizeMb({ width: 1080, height: 1920 }, 60, 30)).toBe(41);
  });

  it("grows with the pixels, the length and the frame rate", () => {
    expect(estimateSizeMb({ width: 1080, height: 1920 }, 120, 30)).toBe(82);
    expect(estimateSizeMb({ width: 1080, height: 1920 }, 60, 60)).toBe(82);
    expect(estimateSizeMb({ width: 720, height: 1280 }, 6, 30)).toBe(1.8);
  });

  it("never shows zero", () => {
    expect(estimateSizeMb({ width: 16, height: 16 }, 1, 30)).toBe(0.1);
  });
});
