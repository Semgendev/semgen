import { z } from "zod";

import { locales } from "@/i18n/config";

// D15: three identities, each in light and dark. Cobalt & Or is the default.
export const PALETTES = ["cobalt", "etincelle", "teal"] as const;
export const paletteSchema = z.enum(PALETTES);
export type Palette = z.infer<typeof paletteSchema>;

export const DEFAULT_PALETTE: Palette = "cobalt";
export const PALETTE_COOKIE = "sg-palette";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Unknown or tampered values fall back to the default instead of breaking the page.
export function parsePalette(value: unknown): Palette {
  const parsed = paletteSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_PALETTE;
}

// The landing page always shows the brand identity, whatever the visitor picked in the app.
const LANDING_PATTERN = new RegExp(`^(/(${locales.join("|")}))?/?$`);

export function isLandingPath(pathname: string): boolean {
  return LANDING_PATTERN.test(pathname);
}

export function paletteForPath(pathname: string, chosen: Palette): Palette {
  return isLandingPath(pathname) ? DEFAULT_PALETTE : chosen;
}

export function paletteCookie(palette: Palette): string {
  return `${PALETTE_COOKIE}=${palette}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

export function readPaletteCookie(cookieHeader: string): Palette {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${PALETTE_COOKIE}=([^;]*)`));
  return parsePalette(match?.[1] ? decodeURIComponent(match[1]) : undefined);
}

// Runs in <head> before the first paint, so the chosen palette never "flashes" from the default.
// Kept tiny and dependency-free on purpose; the pages stay statically rendered.
export const PALETTE_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)${PALETTE_COOKIE}=([^;]*)/);var p=m?decodeURIComponent(m[1]):"${DEFAULT_PALETTE}";if(${JSON.stringify(PALETTES)}.indexOf(p)<0)p="${DEFAULT_PALETTE}";if(${LANDING_PATTERN.toString()}.test(location.pathname))p="${DEFAULT_PALETTE}";document.documentElement.setAttribute("data-palette",p)}catch(e){}})();`;
