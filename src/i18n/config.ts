// English first (default), then the others. Adding a language = add it here, add
// messages/<code>.json and a demo text in features/captions/dev/demo-words.ts.
export const locales = ["en", "fr", "es", "pt", "de", "it", "tr", "sw", "ar", "hi"] as const;
export const defaultLocale = "en" as const;
export type Locale = (typeof locales)[number];

// "fr|en|…" for URL patterns, so a new language only has to be added to `locales`.
export const LOCALE_PATTERN = locales.join("|");

// Languages written from right to left (Hebrew, Persian, Urdu… go here when they are added).
const RTL_LOCALES: readonly string[] = ["ar"];

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function localeDirection(locale: string): "ltr" | "rtl" {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}
