import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createTranslator } from "next-intl";

import { localeDirection, locales } from "@/i18n/config";
import { breakScore, endsSentence } from "@/features/captions/breaks";
import { PREVIEW_LOCALES } from "@/features/captions/dev/demo-words";

type Tree = { [key: string]: string | Tree };

function load(locale: string): Tree {
  return JSON.parse(
    readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8"),
  ) as Tree;
}

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

// {count}, {title}… : the names inside braces, ignoring the ICU plural/select bodies
function variables(message: string): string[] {
  const names = new Set<string>();
  for (const match of message.matchAll(/\{\s*(\w+)\s*(?:,|\})/g)) names.add(match[1] ?? "");
  return [...names].sort();
}

const english = flatten(load("en"));

describe("interface languages", () => {
  it("has a messages file for every language of the list", () => {
    for (const locale of locales) {
      expect(existsSync(join(process.cwd(), "messages", `${locale}.json`)), locale).toBe(true);
    }
  });

  it("has a demo text for the caption previews in every language", () => {
    for (const locale of locales) expect(PREVIEW_LOCALES, locale).toContain(locale);
  });

  for (const locale of locales.filter((value) => value !== "en")) {
    describe(locale, () => {
      const messages = flatten(load(locale));

      it("has exactly the same keys as English", () => {
        expect(Object.keys(messages).sort()).toEqual(Object.keys(english).sort());
      });

      it("keeps every {variable} of the English text", () => {
        for (const [key, text] of Object.entries(english)) {
          expect(variables(messages[key] ?? ""), key).toEqual(variables(text));
        }
      });

      it("has no empty text", () => {
        for (const [key, text] of Object.entries(messages)) expect(text.trim(), key).not.toBe("");
      });
    });
  }
});

describe("right-to-left languages", () => {
  it("writes Arabic from right to left and the others from left to right", () => {
    expect(localeDirection("ar")).toBe("rtl");
    for (const locale of locales.filter((value) => value !== "ar")) {
      expect(localeDirection(locale), locale).toBe("ltr");
    }
  });

  it("uses the Arabic plural forms (one, two, few, many)", () => {
    const balance = flatten(load("ar"))["credits.balance"] ?? "";
    const t = createTranslator({ locale: "ar", messages: { balance } });
    expect(t("balance", { count: 1 })).toBe("رصيد واحد");
    expect(t("balance", { count: 2 })).toBe("رصيدان");
    expect(t("balance", { count: 3 })).toMatch(/أرصدة$/);
    expect(t("balance", { count: 11 })).toMatch(/رصيدًا$/);
  });

  it("cuts captions after Arabic punctuation (، and ؟)", () => {
    expect(endsSentence("غدًا؟")).toBe(true);
    expect(breakScore("مرحبًا،", "سآتي")).toBeGreaterThan(breakScore("سآتي", "إليك"));
  });
});
