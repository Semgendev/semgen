import { describe, expect, it } from "vitest";

import { isDisposableEmail } from "@/features/auth/disposable-domains";
import { magicLinkSchema, safeNextPath } from "@/features/auth/schemas";

describe("magicLinkSchema", () => {
  it("normalises a valid email", () => {
    const result = magicLinkSchema.parse({ email: "  Ashanti@Example.COM ", locale: "fr" });
    expect(result.email).toBe("ashanti@example.com");
    expect(result.locale).toBe("fr");
  });

  it("rejects malformed emails", () => {
    expect(magicLinkSchema.safeParse({ email: "not-an-email", locale: "en" }).success).toBe(false);
    expect(magicLinkSchema.safeParse({ email: "", locale: "en" }).success).toBe(false);
  });

  it("falls back to the default locale for unknown values", () => {
    expect(magicLinkSchema.parse({ email: "a@b.co", locale: "xx" }).locale).toBe("en");
  });
});

describe("safeNextPath", () => {
  it("keeps same-site locale paths", () => {
    expect(safeNextPath("/fr/account", "fr")).toBe("/fr/account");
  });

  it.each(["//evil.com", "https://evil.com", "/\evil.com", "/ja/account", "/fr/../x", null])(
    "rejects %s",
    (next) => {
      expect(safeNextPath(next, "en")).toBe("/en/account");
    },
  );
});

describe("isDisposableEmail", () => {
  it("flags throwaway providers and their subdomains", () => {
    expect(isDisposableEmail("x@yopmail.com")).toBe(true);
    expect(isDisposableEmail("x@inbox.mailinator.com")).toBe(true);
  });

  it("accepts regular providers", () => {
    expect(isDisposableEmail("ashanti@gmail.com")).toBe(false);
    expect(isDisposableEmail("contact@semgen.studio")).toBe(false);
  });
});
