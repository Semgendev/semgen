import { z } from "zod";

import { LOCALE_PATTERN, defaultLocale, locales } from "@/i18n/config";

export const localeSchema = z.enum(locales).catch(defaultLocale);

export const magicLinkSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  locale: localeSchema,
  next: z.string().max(512).optional(),
  captchaToken: z.string().max(4096).optional(),
});

const NEXT_PATH = new RegExp(`^/(${LOCALE_PATTERN})(/[A-Za-z0-9\\-_/]*)?$`);

// Only same-site, locale-prefixed paths: blocks open redirects such as "//evil.com".
export function safeNextPath(next: string | null | undefined, locale: string): string {
  const fallback = `/${locale}/account`;
  if (!next || !NEXT_PATH.test(next)) return fallback;
  return next;
}
