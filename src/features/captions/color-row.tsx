"use client";

import { Check, Palette } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export function ColorRow({
  label,
  swatches,
  value,
  onChange,
}: {
  label: string;
  swatches: string[];
  value: string | undefined;
  onChange: (color: string) => void;
}) {
  const t = useTranslations("captions");
  return (
    <div className="flex flex-col gap-2">
      <span className="text-text-2 text-sm">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {swatches.map((color) => {
          const chosen = value?.toUpperCase() === color.toUpperCase();
          return (
            <button
              key={color}
              type="button"
              aria-pressed={chosen}
              aria-label={t("colorSwatch", { color })}
              onClick={() => onChange(color)}
              className={cn(
                "border-border focus-visible:ring-ring flex size-8 items-center justify-center rounded-full border outline-none focus-visible:ring-2",
                chosen && "ring-brand ring-offset-background ring-2 ring-offset-2",
              )}
              style={{ backgroundColor: color }}
            >
              {chosen ? (
                <Check className="size-4 mix-blend-difference" strokeWidth={3} aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
        <label
          className="border-border hover:border-brand-border focus-within:ring-ring relative flex size-8 cursor-pointer items-center justify-center rounded-full border border-dashed focus-within:ring-2"
          title={t("customColor")}
        >
          <Palette className="text-text-2 size-4" aria-hidden="true" />
          <span className="sr-only">{t("customColor")}</span>
          <input
            type="color"
            value={value ?? swatches[0]}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}
