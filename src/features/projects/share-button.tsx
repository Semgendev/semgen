"use client";

import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Sharing a project by link is planned (who sees what is still to decide): for now the button says so.
export function ShareButton() {
  const t = useTranslations("projects");
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={t("share")}
            className="max-lg:min-h-11 max-sm:size-11 max-sm:px-0"
          />
        }
      >
        <Share2 className="size-4" aria-hidden="true" />
        <span className="max-sm:hidden">{t("share")}</span>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <p className="text-sm font-medium">{t("share")}</p>
        <p className="text-text-2 mt-1 text-xs">{t("shareSoon")}</p>
      </PopoverContent>
    </Popover>
  );
}
