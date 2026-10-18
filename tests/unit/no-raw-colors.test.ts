import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

// CLAUDE.md §10: components use design tokens only. The token files are the single exception.
const ROOT = join(process.cwd(), "src");
const ALLOWED = new Set(["styles/tokens.css", "styles/tokens.json"]);

const RAW_HEX = /#[0-9a-fA-F]{3,8}\b(?![\w-])/;
const TAILWIND_PALETTE =
  /\b(?:bg|text|border|ring|decoration|from|to|via|fill|stroke|outline|shadow|accent|caret)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)(?:-\d{2,3})?\b/;
const CSS_COLOR_FN = /\b(?:rgb|rgba|hsl|hsla)\(/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
}

describe("no raw colours in src/", () => {
  it("uses only design tokens outside src/styles/tokens.*", () => {
    const offenders: string[] = [];
    for (const path of files(ROOT)) {
      const rel = relative(ROOT, path).replaceAll("\\", "/");
      if (ALLOWED.has(rel)) continue;
      readFileSync(path, "utf8")
        .split("\n")
        .forEach((line, index) => {
          if (RAW_HEX.test(line) || TAILWIND_PALETTE.test(line) || CSS_COLOR_FN.test(line)) {
            offenders.push(`${rel}:${index + 1}: ${line.trim()}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });
});
