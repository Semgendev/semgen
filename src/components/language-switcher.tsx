"use client";

import { useLocale, useTranslations } from "next-intl";
import { locales, type Locale } from "@/i18n/config";
import { useRouter, usePathname } from "@/i18n/routing";

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
  const pathname = usePathname();

  // every language in its own name (Español, Deutsch…), whatever the current one
  const languages = locales.map((value) => ({
    value,
    label: nativeName(value) ?? t(value as "en" | "fr"),
  }));

  const handleChangeLanguage = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon" aria-label={t("label")} />}
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
