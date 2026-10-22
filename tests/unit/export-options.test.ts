import { describe, expect, it } from "vitest";

import { sameShape } from "@/features/captions/remotion/export-props";
import {
  canExport4k,
  exportCost,
  exportOptionsSchema,
  exportSize,
} from "@/features/export/options";

const portrait = { width: 1080, height: 1920 };
const landscape4k = { width: 3840, height: 2160 };

describe("export options", () => {
  it("accepts only the known formats, fits and qualities", () => {
    expect(
      exportOptionsSchema.safeParse({ format: "9:16", fit: "blur", quality: "1080p" }).success,
    ).toBe(true);
    expect(
      exportOptionsSchema.safeParse({ format: "4:3", fit: "crop", quality: "1080p" }).success,
    ).toBe(false);
    expect(
      exportOptionsSchema.safeParse({ format: "1:1", fit: "crop", quality: "8k" }).success,
    ).toBe(false);
  });

  it("sizes every format from its short side", () => {
    expect(exportSize({ format: "9:16", quality: "1080p" }, portrait)).toEqual(portrait);
    expect(exportSize({ format: "16:9", quality: "1080p" }, portrait)).toEqual({
      width: 1920,
      height: 1080,
    });
    expect(exportSize({ format: "1:1", quality: "720p" }, portrait)).toEqual({
      width: 720,
      height: 720,
    });
    expect(exportSize({ format: "9:16", quality: "4k" }, landscape4k)).toEqual({
      width: 2160,
      height: 3840,
    });
  });

  it("keeps the shape of the source in the original format, with even sizes", () => {
    expect(exportSize({ format: "original", quality: "720p" }, portrait)).toEqual({
      width: 720,
      height: 1280,
    });
    // 4:3 source of odd size
    expect(exportSize({ format: "original", quality: "1080p" }, { width: 1001, height: 750 })).toEqual(
      { width: 1442, height: 1080 },
    );
  });

  it("offers 4K only from a 4K source", () => {
    expect(canExport4k(portrait)).toBe(false);
    expect(canExport4k(landscape4k)).toBe(true);
    expect(canExport4k({ width: 2160, height: 3840 })).toBe(true);
  });

  it("charges only 4K, 1 credit per started minute", () => {
    expect(exportCost("720p", 170)).toBe(0);
    expect(exportCost("1080p", 170)).toBe(0);
    expect(exportCost("4k", 12)).toBe(1);
    expect(exportCost("4k", 60)).toBe(1);
    expect(exportCost("4k", 61)).toBe(2);
    expect(exportCost("4k", 180)).toBe(3);
  });

  it("knows when the video fills the exported frame", () => {
    expect(sameShape({ width: 720, height: 1280 }, portrait)).toBe(true);
    expect(sameShape({ width: 1080, height: 1080 }, portrait)).toBe(false);
    expect(sameShape({ width: 1080, height: 1080 }, undefined)).toBe(true);
  });
});
