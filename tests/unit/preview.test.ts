import { describe, expect, it } from "vitest";

import type { MediaInfo } from "@/features/media/probe";
import { buildPreviewArgs, isBrowserSafe, isHdr } from "@/features/media/preview";

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

describe("isBrowserSafe", () => {
  it("accepts an 8-bit H.264 + AAC mp4", () => {
    expect(isBrowserSafe(base, "u/p/source.mp4")).toBe(true);
    expect(isBrowserSafe({ ...base, hasAudio: false, audioCodec: null }, "u/p/source.MP4")).toBe(
      true,
    );
  });

  it("rejects iPhone-style HEVC 10-bit .mov files", () => {
    const iphone = { ...base, videoCodec: "hevc", pixelFormat: "yuv420p10le" };
    expect(isBrowserSafe(iphone, "u/p/source.mov")).toBe(false);
  });

  it("rejects other containers, codecs, audio and HDR", () => {
    expect(isBrowserSafe(base, "u/p/source.mov")).toBe(false);
    expect(isBrowserSafe(base, "u/p/source.webm")).toBe(false);
    expect(isBrowserSafe({ ...base, videoCodec: "hevc" }, "u/p/source.mp4")).toBe(false);
    expect(isBrowserSafe({ ...base, audioCodec: "ac3" }, "u/p/source.mp4")).toBe(false);
    expect(isBrowserSafe({ ...base, colorTransfer: "arib-std-b67" }, "u/p/source.mp4")).toBe(false);
  });
});

describe("buildPreviewArgs", () => {
  it("builds an H.264/AAC faststart command and keeps audio when present", () => {
    const args = buildPreviewArgs("in.mov", "out.mp4", base);
    expect(args.slice(0, 3)).toEqual(["-y", "-i", "in.mov"]);
    expect(args).toContain("libx264");
    expect(args).toContain("aac");
    expect(args).toContain("+faststart");
    expect(args.at(-1)).toBe("out.mp4");
    expect(args.join(" ")).not.toContain("tonemap");
  });

  it("drops the audio options for silent videos", () => {
    const args = buildPreviewArgs("in.mov", "out.mp4", {
      ...base,
      hasAudio: false,
      audioCodec: null,
    });
    expect(args).not.toContain("aac");
    expect(args).not.toContain("0:a:0");
  });

  it("tone-maps HDR sources to SDR", () => {
    const hdr = { ...base, colorTransfer: "arib-std-b67" };
    expect(isHdr(hdr)).toBe(true);
    expect(buildPreviewArgs("in.mov", "out.mp4", hdr).join(" ")).toContain("tonemap");
  });
});
