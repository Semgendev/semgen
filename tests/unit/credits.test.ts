import { describe, expect, it } from "vitest";

import { parseCreditHistory } from "@/features/credits/queries";

describe("parseCreditHistory", () => {
  it("accepts valid ledger rows", () => {
    const rows = [{ id: 1, delta: 10, reason: "signup_bonus", created_at: "2026-10-18T00:00:00Z" }];
    expect(parseCreditHistory(rows)).toEqual(rows);
  });

  it("rejects unknown reasons and malformed rows", () => {
    expect(() =>
      parseCreditHistory([{ id: 1, delta: 10, reason: "gift", created_at: "x" }]),
    ).toThrow();
    expect(() =>
      parseCreditHistory([{ id: "1", delta: 1.5, reason: "job", created_at: "x" }]),
    ).toThrow();
  });
});
