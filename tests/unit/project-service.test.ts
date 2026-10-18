import { describe, expect, it } from "vitest";

import { parseProjects } from "@/features/projects/service";

const valid = {
  id: "b28f9644-c3c7-4a31-8225-017f8b8bad2a",
  title: "airport background2",
  status: "uploaded",
  source_video_key: "user/project/source.mp4",
  source_size_bytes: 5_950_000,
  duration_s: null,
  detected_language: null,
  created_at: "2026-10-18T02:00:00Z",
};

describe("parseProjects", () => {
  it("accepts rows coming from the database", () => {
    expect(parseProjects([valid])).toEqual([valid]);
  });

  it("rejects an unknown status or a malformed id", () => {
    expect(() => parseProjects([{ ...valid, status: "archived" }])).toThrow();
    expect(() => parseProjects([{ ...valid, id: "nope" }])).toThrow();
  });
});
