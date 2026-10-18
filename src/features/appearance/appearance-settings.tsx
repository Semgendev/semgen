"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

import { PALETTES, type Palette } from "./palette";
import { usePalette } from "./palette-provider";

const MODES = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
  { value: "system", Icon: Monitor },
] as const;

const noopSubscribe = () => () => undefined;

// Arrow keys move the selection inside a radiogroup, as screen-reader users expect.
function onArrows<T>(
  event: KeyboardEvent,
  values: readonly T[],
  current: T,
  select: (v: T) => void,
) {
  const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!delta) return;
  event.preventDefault();
  const index = (values.indexOf(current) + delta + values.length) % values.length;
  const next = values[index];
  if (next !== undefined) {
    select(next);
    const group = event.currentTarget.closest('[role="radiogroup"]');
    group?.querySelectorAll<HTMLElement>('[role="radio"]')[index]?.focus();
  }
}

function PalettePreview({ palette }: { palette: Palette }) {
  // data-palette on a nested element re-scopes the tokens: a true miniature of the palette.
  return (
    <div
      data-palette={palette}
      aria-hidden="true"
      className="bg-bg border-border flex flex-col gap-2 rounded-lg border p-3"
    >
      <div className="bg-surface flex items-center justify-between rounded-md p-2">
        <span className="bg-text-3/40 h-1.5 w-10 rounded-full" />
        <span className="bg-brand h-4 w-12 rounded" />
      </div>
      <span className="bg-text-3/30 h-1.5 w-3/4 rounded-full" />
      <span className="bg-text-3/30 h-1.5 w-1/2 rounded-full" />
      <div className="mt-1 flex items-center gap-1.5">
        <span className="bg-brand size-3.5 rounded-full" />
        <span className="bg-spark size-3.5 rounded-full" />
        <span className="bg-text size-3.5 rounded-full" />
        <span className="bg-spark text-on-spark ml-auto rounded px-1.5 text-[10px] font-semibold">
          10
        </span>
      </div>
    </div>
  );
}

export function AppearanceSettings() {
  const t = useTranslations("appearance");
  const { palette, setPalette } = usePalette();
  const { theme, setTheme } = useTheme();
  // next-themes only knows the stored mode after mounting: avoid a wrong selection on first paint.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const mode = mounted ? (theme ?? "system") : "system";

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="mode-title" className="flex flex-col gap-3">
        <h2 id="mode-title" className="text-lg font-semibold">
          {t("mode")}
        </h2>
        <div
          role="radiogroup"
          aria-labelledby="mode-title"
          className="grid grid-cols-3 gap-2 sm:max-w-md"
        >
          {MODES.map(({ value, Icon }) => {
            const selected = mode === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTheme(value)}
                onKeyDown={(event) =>
                  onArrows(
                    event,
                    MODES.map((m) => m.value),
                    mode as (typeof MODES)[number]["value"],
                    setTheme,
                  )
                }
                className={cn(
                  "focus-visible:ring-focus flex min-h-11 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  selected
                    ? "border-brand-border bg-surface text-text"
                    : "border-border-strong/50 text-text-2 hover:bg-surface-2",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {t(`modes.${value}`)}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="palette-title" className="flex flex-col gap-3">
        <div>
          <h2 id="palette-title" className="text-lg font-semibold">
            {t("palette")}
          </h2>
          <p className="text-text-2 text-sm">{t("paletteHint")}</p>
        </div>
        <div
          role="radiogroup"
          aria-labelledby="palette-title"
          className="grid gap-3 sm:grid-cols-3"
        >
          {PALETTES.map((value) => {
            const selected = palette === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setPalette(value)}
                onKeyDown={(event) => onArrows(event, PALETTES, palette, setPalette)}
                className={cn(
                  "focus-visible:ring-focus bg-surface relative flex flex-col gap-3 rounded-xl border-2 p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  selected ? "border-brand-border" : "border-border hover:border-border-strong",
                )}
              >
                <PalettePreview palette={value} />
                <span className="flex items-center justify-between gap-2">
                  <span className="flex flex-col">
                    <span className="font-medium">{t(`palettes.${value}.name`)}</span>
                    <span className="text-text-2 text-xs">{t(`palettes.${value}.mood`)}</span>
                  </span>
                  {selected ? (
                    <span className="bg-brand text-on-brand flex size-6 shrink-0 items-center justify-center rounded-full">
                      <Check className="size-4" aria-hidden="true" />
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-text-3 text-sm">{t("savedAutomatically")}</p>
      </section>
    </div>
  );
}
