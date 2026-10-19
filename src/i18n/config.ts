// English first (default), then the others. Adding a language = add it here, add
// messages/<code>.json and a demo text in features/captions/dev/demo-words.ts.
export const locales = ["en", "fr", "es"] as const;
export const defaultLocale = "en" as const;
export type Locale = (typeof locales)[number];

// "fr|en|…" for URL patterns, so a new language only has to be added to `locales`.
export const LOCALE_PATTERN = locales.join("|");

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
