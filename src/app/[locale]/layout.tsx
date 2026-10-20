import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { PostHogProvider } from "@/components/posthog-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { PALETTE_SCRIPT } from "@/features/appearance/palette";
import { PaletteProvider } from "@/features/appearance/palette-provider";
import { localeDirection } from "@/i18n/config";
import { locales } from "@/i18n/routing";

import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Rarely shown (timecodes in the labs): not preloaded, fetched only where it is used.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

// Headings: geometric and confident (docs/DESIGN.md). Both fonts are OFL 1.1, self-hosted by Next.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  // a variable font: one file for every weight, instead of one per weight
});

// Arabic interface: Noto Sans Arabic (OFL 1.1), Arabic letters only (Google's version also has Latin
// ones, which would replace Geist and Jakarta). One variable file for all the weights, not preloaded:
// the browser only downloads it when a page shows Arabic text.
const notoArabic = localFont({
  src: "../fonts/noto-sans-arabic.woff2",
  variable: "--font-script",
  weight: "100 900",
  preload: false,
  // no local fallback face: it would also catch Latin letters, which must stay in Geist
  fallback: [],
  adjustFontFallback: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0600-06FF, U+0750-077F, U+0870-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FEFC",
    },
  ],
});

// Hindi interface: Noto Sans Devanagari (OFL 1.1), same idea: Devanagari letters only, fetched only
// on Hindi pages. Only one of the two fonts is ever applied to a page (both set --font-script).
const notoDevanagari = localFont({
  src: "../fonts/noto-sans-devanagari.woff2",
  variable: "--font-script",
  weight: "100 900",
  preload: false,
  fallback: [],
  adjustFontFallback: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+25CC, U+A830-A839, U+A8E0-A8FF",
    },
  ],
});

// The font of the non-Latin script of a language, if its letters are not in Geist and Jakarta.
const SCRIPT_FONT_CLASS: Record<string, string> = {
  ar: notoArabic.variable,
  hi: notoDevanagari.variable,
};

export const metadata: Metadata = {
  title: "SemGen Studio",
  description: "SemGen Studio",
};

type LayoutProps = { children: React.ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function RootLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!(locales as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = localeDirection(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      data-palette="cobalt"
      className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable} ${SCRIPT_FONT_CLASS[locale] ?? ""} h-full antialiased`}
    >
      <head>
        {/* Sets the chosen palette before the first paint (no flash). Static, no user input. */}
        <script dangerouslySetInnerHTML={{ __html: PALETTE_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PostHogProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <PaletteProvider>{children}</PaletteProvider>
            </ThemeProvider>
          </PostHogProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
