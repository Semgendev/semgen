"use client";

import { Check, Palette, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";

import { cn } from "@/lib/utils";

import { parseHexInput } from "./colors";

// One colour to choose (the text, the key word, the outline): round swatches, the colour picker of
// the browser, and a small field to type or paste a code. The colours a person adds are kept in
// their account and shown after the ready-made ones.
export function ColorField({
  label,
  swatches,
  value,
  custom,
  onChange,
  onAddCustom,
  onRemoveCustom,
}: {
  label: string;
  swatches: string[];
  value: string | undefined;
  custom: string[];
  onChange: (color: string) => void;
  onAddCustom: (color: string) => void;
  onRemoveCustom: (color: string) => void;
}) {
  const t = useTranslations("captions.colors");
  const hexId = useId();
  const [text, setText] = useState("");

  const parsed = parseHexInput(text);
  const invalid = text.trim() !== "" && parsed === null;
  const known = (color: string) =>
    [...swatches, ...custom].some((other) => other.toUpperCase() === color.toUpperCase());

  // a typed or pasted code: applied, and kept in the account when it is not a ready-made colour
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!parsed) return;
    onChange(parsed);
    if (!known(parsed)) onAddCustom(parsed);
    setText("");
  }

  function swatch(color: string, removable: boolean) {
    const chosen = value?.toUpperCase() === color.toUpperCase();
    return (
      <span key={color} className="group relative">
        <button
          type="button"
          aria-pressed={chosen}
          aria-label={t("swatch", { color })}
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
        {removable ? (
          <button
            type="button"
            aria-label={t("remove", { color })}
            title={t("remove", { color })}
            onClick={() => onRemoveCustom(color)}
            className="bg-surface border-border text-text-2 hover:text-danger focus-visible:ring-ring absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full border opacity-0 outline-none group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:ring-2 pointer-coarse:opacity-100"
          >
            <X className="size-2.5" strokeWidth={3} aria-hidden="true" />
          </button>
        ) : null}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-text-2 text-sm">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {swatches.map((color) => swatch(color, false))}
        {custom.map((color) => swatch(color, true))}
        <label
          className="border-border hover:border-brand-border focus-within:ring-ring relative flex size-8 cursor-pointer items-center justify-center rounded-full border border-dashed focus-within:ring-2"
          title={t("pick")}
        >
          <Palette className="text-text-2 size-4" aria-hidden="true" />
          <span className="sr-only">{t("pick")}</span>
          <input
            type="color"
            value={value ?? swatches[0]}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            onBlur={(event) => {
              // the picker is closed: a colour that is not ready-made is kept in the account
              const color = event.target.value.toUpperCase();
              if (value && !known(color)) onAddCustom(color);
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>

      <form onSubmit={submit} className="flex items-center gap-1.5">
        <div
          className={cn(
            "border-border focus-within:ring-ring flex h-8 w-32 items-center rounded-lg border font-mono text-xs focus-within:ring-2",
            invalid && "border-danger",
          )}
        >
          <span aria-hidden="true" className="text-text-3 ps-2">
            #
          </span>
          <input
            id={hexId}
            type="text"
            value={text}
            placeholder="FF8800"
            aria-label={t("code")}
            aria-invalid={invalid}
            aria-describedby={invalid ? `${hexId}-error` : undefined}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={8}
            onChange={(event) => setText(event.target.value.replace(/^#/, ""))}
            onKeyDown={(event) => {
              if (event.key === "Escape") setText("");
            }}
            className="placeholder:text-text-3 min-w-0 flex-1 bg-transparent px-1 uppercase outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!parsed}
          aria-label={t("validate")}
          title={t("validate")}
          className="border-border text-text-2 hover:text-brand-text hover:border-brand-border focus-visible:ring-ring flex size-8 items-center justify-center rounded-lg border outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-40"
        >
          <Check className="size-4" aria-hidden="true" />
        </button>
      </form>
      {invalid ? (
        <p id={`${hexId}-error`} role="alert" className="text-danger text-xs">
          {t("invalid")}
        </p>
      ) : null}
    </div>
  );
}
