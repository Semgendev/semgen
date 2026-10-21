"use client";

import { useLocale, useTranslations } from "next-intl";
import { LOCALE_PATTERN, locales, type Locale } from "@/i18n/config";
import { useRouter } from "@/i18n/routing";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function nativeName(locale: string): string | undefined {
  try {
    const name = new Intl.DisplayNames([locale], { type: "language" }).of(locale);
    return name ? name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) : undefined;
  } catch {
    return undefined;
  }
}

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();

  // every language in its own name (Español, Deutsch…), whatever the current one
  const languages = locales.map((value) => ({
    value,
    label: nativeName(value) ?? value.toUpperCase(),
  }));

  // The page address is read when a language is chosen, not while rendering: reading it while
  // rendering (usePathname) would stop Next.js from preparing the page in advance.
  const handleChangeLanguage = (newLocale: Locale) => {
    const pathname =
      window.location.pathname.replace(new RegExp(`^/(${LOCALE_PATTERN})(?=/|$)`), "") || "/";
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label={t("label")}
            className="max-lg:size-11"
          />
        }
      >
        <span className="text-xs font-semibold tracking-wide" aria-hidden="true">
          {locale.toUpperCase()}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map(({ value, label }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => handleChangeLanguage(value)}
            className={locale === value ? "bg-primary/10" : ""}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
