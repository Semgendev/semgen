// Project names are shown on one short line: past this many characters the rest becomes "…".
export const TITLE_DISPLAY_MAX = 28;

export function shortTitle(title: string, max = TITLE_DISPLAY_MAX): string {
  const chars = Array.from(title);
  return chars.length > max ? `${chars.slice(0, max).join("").trimEnd()}…` : title;
}
