import { describe, expect, it } from "vitest";

import {
  defaultProjectTitle,
  MAX_VIDEO_BYTES,
  validateVideoDuration,
  validateVideoFile,
} from "@/features/projects/limits";
import { projectIdSchema, projectTitleSchema } from "@/features/projects/schemas";

describe("validateVideoFile", () => {
  it.each([
    ["clip.mp4", "video/mp4"],
    ["CLIP.MOV", "video/quicktime"],
    ["a.b.webm", "video/webm"],
    ["talk.mkv", "video/x-matroska"],
  ])("accepts %s", (name, contentType) => {
    const result = validateVideoFile({ name, size: 1024 });
    expect(result).toMatchObject({ ok: true, contentType });
  });

  it.each(["notes.txt", "photo.png", "video.exe", "noextension", "clip.mp4.zip"])(
    "rejects unsupported file %s",
    (name) => {
      expect(validateVideoFile({ name, size: 1024 })).toEqual({
        ok: false,
        error: "unsupported_type",
      });
    },
  );

  it("rejects empty and oversized files", () => {
    expect(validateVideoFile({ name: "a.mp4", size: 0 })).toEqual({ ok: false, error: "empty" });
    expect(validateVideoFile({ name: "a.mp4", size: MAX_VIDEO_BYTES + 1 })).toEqual({
      ok: false,
      error: "too_large",
    });
    expect(validateVideoFile({ name: "a.mp4", size: MAX_VIDEO_BYTES }).ok).toBe(true);
  });
});

describe("validateVideoDuration", () => {
  it("rejects videos longer than the plan allows", () => {
    expect(validateVideoDuration(181)).toBe("too_long");
    expect(validateVideoDuration(180)).toBeNull();
  });

  it("lets unreadable durations through (the server verifies later)", () => {
    expect(validateVideoDuration(null)).toBeNull();
  });
});

describe("project schemas", () => {
  it("defaults the title from the file name", () => {
    expect(defaultProjectTitle("My Holiday.mp4")).toBe("My Holiday");
    expect(defaultProjectTitle(".mp4")).toBe("Video");
  });

  it("validates titles and ids", () => {
    expect(projectTitleSchema.safeParse("  Hello ").data).toBe("Hello");
    expect(projectTitleSchema.safeParse("   ").success).toBe(false);
    expect(projectTitleSchema.safeParse("x".repeat(121)).success).toBe(false);
    expect(projectIdSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});
