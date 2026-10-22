import { describe, expect, it } from "vitest";

import { chooseRenderSource } from "@/features/export/render-source";
import type { MediaInfo } from "@/features/media/probe";
import {
  buildWorkingCopyArgs,
  needsWorkingCopy,
  workingCopySize,
} from "@/features/media/working-copy";

const base: MediaInfo = {
  durationSeconds: 10,
  hasAudio: true,
  width: 1920,
  height: 1080,
  fps: 30,
  videoCodec: "h264",
  pixelFormat: "yuv420p",
  colorTransfer: "bt709",
  audioCodec: "aac",
};

describe("needsWorkingCopy", () => {
  it("keeps the original when it is already 8-bit H.264 mp4 up to 1080p", () => {
    expect(needsWorkingCopy(base, "u/p/source.mp4")).toBe(false);
  });

  it("makes a copy for HEVC, HDR, non-mp4 and bigger than 1080p", () => {
    expect(needsWorkingCopy({ ...base, videoCodec: "hevc" }, "u/p/source.mp4")).toBe(true);
    expect(needsWorkingCopy({ ...base, colorTransfer: "arib-std-b67" }, "u/p/source.mp4")).toBe(
      true,
    );
    expect(needsWorkingCopy(base, "u/p/source.mov")).toBe(true);
    expect(needsWorkingCopy({ ...base, width: 3840, height: 2160 }, "u/p/source.mp4")).toBe(true);
  });
});

describe("workingCopySize", () => {
  it("caps the short side at 1080 and never enlarges", () => {
    expect(workingCopySize({ width: 3840, height: 2160 })).toEqual({ width: 1920, height: 1080 });
    expect(workingCopySize({ width: 2160, height: 3840 })).toEqual({ width: 1080, height: 1920 });
    expect(workingCopySize({ width: 1280, height: 720 })).toEqual({ width: 1280, height: 720 });
  });
});

describe("buildWorkingCopyArgs", () => {
  it("is near-lossless with one key frame per second and copies AAC audio", () => {
    const args = buildWorkingCopyArgs("in", "out.mp4", { ...base, fps: 29.97 });
    expect(args[args.indexOf("-crf") + 1]).toBe("18");
    expect(args[args.indexOf("-g") + 1]).toBe("30");
    expect(args.join(" ")).toContain("-c:a copy");
    expect(args.join(" ")).not.toContain("zscale");
  });

  it("tone-maps HDR and re-encodes non-AAC audio", () => {
    const args = buildWorkingCopyArgs("in", "out.mp4", {
      ...base,
      colorTransfer: "arib-std-b67",
      audioCodec: "opus",
    });
    expect(args.join(" ")).toContain("tonemap");
    expect(args.join(" ")).toContain("-c:a aac");
  });
});

describe("chooseRenderSource", () => {
  const uhd = { width: 3840, height: 2160 };
  const original = { format: "original", fit: "crop", quality: "1080p" } as const;

  it("reads the original when there is no copy or the export is 4K", () => {
    expect(chooseRenderSource(original, uhd, false)).toBe("original");
    expect(chooseRenderSource({ ...original, quality: "4k" }, uhd, true)).toBe("original");
  });

  it("uses the copy when it already has the pixels shown", () => {
    expect(chooseRenderSource(original, uhd, true)).toBe("working");
    expect(chooseRenderSource({ ...original, quality: "720p" }, uhd, true)).toBe("working");
  });

  it("reads the original when a crop needs more pixels than the copy has", () => {
    // 4K landscape cropped to 9:16 1080p: the visible band is only 1215 px wide in the original.
    expect(chooseRenderSource({ ...original, format: "9:16" }, uhd, true)).toBe("original");
    // with a blurred background the whole video is shown: the copy is enough
    expect(chooseRenderSource({ ...original, format: "9:16", fit: "blur" }, uhd, true)).toBe(
      "working",
    );
  });
});
