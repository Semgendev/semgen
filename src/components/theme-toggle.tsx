"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

// One button, one icon: it shows the mode you are in (sun = light, moon = dark) and a click
// switches to the other. The first visit follows the device setting (next-themes "system"), but
// there is no third "system" choice to confuse people. Icons and the accessible name are swapped
// with CSS (`dark:`), so server and browser render the same HTML (no flash, no mismatch).
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("theme");

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4 dark:hidden" aria-hidden="true" />
      <Moon className="hidden size-4 dark:block" aria-hidden="true" />
      <span className="sr-only dark:hidden">{t("switchToDark")}</span>
      <span className="sr-only hidden dark:inline">{t("switchToLight")}</span>
    </Button>
  );
}
