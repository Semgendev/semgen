"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { AccordionSection } from "./accordion-section";
import { ColorField } from "./color-field";
import type { CaptionColors } from "./colors";
import { loadPreviewFont, previewFamily } from "./fonts";
import { ACCENT_SWATCHES, DEFAULT_OUTLINE_COLOR, OUTLINE_SWATCHES, TEXT_SWATCHES } from "./presets";
import { FONT_IDS, type FontId } from "./style";
import {
  OUTLINE_SIZES,
  SIZE_DEFAULT,
  SIZE_MAX,
  SIZE_MIN,
  SIZE_STEP,
  TWEAK_ANIMATIONS,
  TWEAK_POSITIONS,
  chosenFonts,
  hasTweaks,
  type CaptionTweaks,
  type TweakPosition,
} from "./tweaks";

// Readable names of the fonts (proper names: not translated).
const FONT_NAMES: Record<FontId, string> = {
  anton: "Anton",
  bebas: "Bebas Neue",
  montserrat: "Montserrat",
  playfair: "Playfair",
  poppins: "Poppins",
  instrument: "Instrument Serif",
  "inter-tight": "Inter Tight",
  pinyon: "Pinyon Script",
  manrope: "Manrope",
  bricolage: "Bricolage",
  fraunces: "Fraunces",
  syne: "Syne",
  sora: "Sora",
  "dm-serif": "DM Serif",
  outfit: "Outfit",
  anybody: "Anybody",
};

// A choice button: big enough for a finger, clear when chosen.
function Choice({
  chosen,
  onClick,
  children,
  className,
  style,
}: {
  chosen: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={chosen}
      onClick={onClick}
      style={style}
      className={cn(
        "focus-visible:ring-focus flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-center text-sm transition-colors outline-none focus-visible:ring-2",
        chosen
          ? "border-brand bg-brand/10 text-text font-semibold"
          : "border-border text-text-2 hover:border-brand-border hover:text-text",
        className,
      )}
    >
      {children}
    </button>
  );
}

// "As designed": the same size as the other tiles, centred above them.
function OriginTile({
  chosen,
  onClick,
  label,
}: {
  chosen: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <div className="flex justify-center">
      <Choice chosen={chosen} onClick={onClick} className="w-[calc(50%-0.25rem)]">
        {label}
      </Choice>
    </div>
  );
}

// A tiny phone with the caption drawn at the chosen height.
function PositionIcon({ position }: { position: TweakPosition }) {
  const top = { top: "14%", middle: "44%", bottom: "74%" }[position];
  return (
    <span
      aria-hidden="true"
      className="border-border-strong relative block h-12 w-7 rounded-md border-2"
    >
      <span className="bg-brand absolute inset-x-1 h-1.5 rounded-full" style={{ top }} />
    </span>
  );
}

// Size of one look, in % of the style: a slider with the value, and a way back to the original.
function SizeSlider({
  label,
  value,
  onChange,
  originalLabel,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  originalLabel: string;
}) {
  const shown = value ?? SIZE_DEFAULT;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-text-2 text-sm font-medium">{label}</span>
        <span className="flex items-center gap-2">
          {value !== undefined ? (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="text-text-2 hover:text-text focus-visible:ring-ring flex items-center gap-1 rounded text-xs outline-none focus-visible:ring-2"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              {originalLabel}
            </button>
          ) : null}
          <output className="text-text w-12 text-end text-sm font-semibold tabular-nums">
            {shown} %
          </output>
        </span>
      </div>
      <input
        type="range"
        min={SIZE_MIN}
        max={SIZE_MAX}
        step={SIZE_STEP}
        value={shown}
        aria-label={label}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(next === SIZE_DEFAULT ? undefined : next);
        }}
        className="accent-brand h-11 w-full cursor-pointer"
      />
    </div>
  );
}

export type SettingsPanelProps = {
  colors: CaptionColors;
  tweaks: CaptionTweaks;
  customColors: string[];
  onColors: (colors: CaptionColors) => void;
  onTweaks: (tweaks: CaptionTweaks) => void;
  onAddCustomColor: (color: string) => void;
  onRemoveCustomColor: (color: string) => void;
  // an animation was chosen: play it once on the preview ("stop" for none)
  onReplay: (mode: "once" | "stop") => void;
  onResetAll: () => void;
};

// The settings of the chosen style, in plain words, in unfolding groups: colours, font, size,
// animation, position, outline. Every change shows at once on the video and is saved.
export function SettingsPanel({
  colors,
  tweaks,
  customColors,
  onColors,
  onTweaks,
  onAddCustomColor,
  onRemoveCustomColor,
  onReplay,
  onResetAll,
}: SettingsPanelProps) {
  const t = useTranslations("captions");
  const [fontTarget, setFontTarget] = useState<"text" | "emphasis">("text");
  const hasColors = Boolean(colors.text || colors.accent);
  const fonts = chosenFonts(tweaks);
  const original = t("tweaks.original");

  // the fonts are written in themselves: fetch their letters when the settings open
  useEffect(() => {
    for (const id of FONT_IDS) loadPreviewFont(id);
  }, []);

  function setTweaks(patch: Partial<CaptionTweaks>) {
    const next: CaptionTweaks = { ...tweaks, ...patch };
    // an empty group is no group
    if (next.fonts && !next.fonts.text && !next.fonts.emphasis) delete next.fonts;
    if (next.sizes && !next.sizes.text && !next.sizes.emphasis) delete next.sizes;
    for (const key of Object.keys(next) as (keyof CaptionTweaks)[]) {
      if (next[key] === undefined) delete next[key];
    }
    onTweaks(next);
  }

  function setFont(target: "text" | "emphasis", id: FontId | undefined) {
    // the first version's single font is split, so changing one look keeps the other as it was
    const current = chosenFonts(tweaks);
    const next = { ...current, [target]: id };
    setTweaks({ font: undefined, fonts: { text: next.text, emphasis: next.emphasis } });
  }

  const fontSummary =
    fonts.text || fonts.emphasis
      ? [
          fonts.text ? FONT_NAMES[fonts.text] : original,
          fonts.emphasis ? FONT_NAMES[fonts.emphasis] : original,
        ].join(" · ")
      : original;
  const sizeSummary =
    tweaks.sizes?.text || tweaks.sizes?.emphasis
      ? `${tweaks.sizes?.text ?? SIZE_DEFAULT} % · ${tweaks.sizes?.emphasis ?? SIZE_DEFAULT} %`
      : original;
  const outline = tweaks.outline;

  return (
    <>
      <AccordionSection
        title={t("colorsTitle")}
        summary={hasColors ? t("tweaks.changed") : original}
        help={t("colorsHelp")}
        defaultOpen
      >
        <div className="flex flex-col gap-4">
          <ColorField
            label={t("textColor")}
            swatches={TEXT_SWATCHES}
            value={colors.text}
            custom={customColors}
            onChange={(text) => onColors({ ...colors, text })}
            onAddCustom={onAddCustomColor}
            onRemoveCustom={onRemoveCustomColor}
          />
          <ColorField
            label={t("accentColor")}
            swatches={ACCENT_SWATCHES}
            value={colors.accent}
            custom={customColors}
            onChange={(accent) => onColors({ ...colors, accent })}
            onAddCustom={onAddCustomColor}
            onRemoveCustom={onRemoveCustomColor}
          />
        </div>
        {hasColors ? (
          <button
            type="button"
            onClick={() => onColors({})}
            className="text-text-2 hover:text-text focus-visible:ring-ring flex w-fit items-center gap-1.5 rounded-md text-sm outline-none focus-visible:ring-2"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {t("resetColors")}
          </button>
        ) : null}
      </AccordionSection>

      <AccordionSection
        title={t("tweaks.fontTitle")}
        summary={fontSummary}
        help={t("tweaks.fontHelp")}
      >
        <div
          role="tablist"
          aria-label={t("tweaks.fontTitle")}
          className="bg-surface-2 border-border flex gap-1 rounded-xl border p-1"
        >
          {(["text", "emphasis"] as const).map((target) => (
            <button
              key={target}
              type="button"
              role="tab"
              aria-selected={fontTarget === target}
              onClick={() => setFontTarget(target)}
              className={cn(
                "focus-visible:ring-focus min-h-10 flex-1 rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2",
                fontTarget === target
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-2 hover:text-text",
              )}
            >
              {target === "text" ? t("tweaks.fontTabText") : t("tweaks.fontTabEmphasis")}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label={t("tweaks.fontTitle")} className="flex flex-col gap-2">
          <OriginTile
            chosen={!fonts[fontTarget]}
            onClick={() => setFont(fontTarget, undefined)}
            label={original}
          />
          <div className="grid grid-cols-2 gap-2">
            {FONT_IDS.map((id) => (
              <Choice
                key={id}
                chosen={fonts[fontTarget] === id}
                onClick={() => setFont(fontTarget, id)}
                className="min-h-12 text-base"
                style={{ fontFamily: previewFamily(id), fontWeight: 700 }}
              >
                {FONT_NAMES[id]}
              </Choice>
            ))}
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title={t("tweaks.sizeTitle")}
        summary={sizeSummary}
        help={t("tweaks.sizeHelp")}
      >
        <SizeSlider
          label={t("tweaks.sizeText")}
          value={tweaks.sizes?.text}
          originalLabel={original}
          onChange={(text) => setTweaks({ sizes: { ...tweaks.sizes, text } })}
        />
        <SizeSlider
          label={t("tweaks.sizeEmphasis")}
          value={tweaks.sizes?.emphasis}
          originalLabel={original}
          onChange={(emphasis) => setTweaks({ sizes: { ...tweaks.sizes, emphasis } })}
        />
      </AccordionSection>

      <AccordionSection
        title={t("tweaks.animationTitle")}
        summary={tweaks.animation ? t(`tweaks.animations.${tweaks.animation}`) : original}
        help={t("tweaks.animationHelp")}
      >
        <div
          role="radiogroup"
          aria-label={t("tweaks.animationTitle")}
          className="flex flex-col gap-2"
        >
          <OriginTile
            chosen={!tweaks.animation}
            onClick={() => {
              setTweaks({ animation: undefined });
              onReplay("once");
            }}
            label={original}
          />
          <div className="grid grid-cols-2 gap-2">
            {TWEAK_ANIMATIONS.map((id) => (
              <Choice
                key={id}
                chosen={tweaks.animation === id}
                onClick={() => {
                  setTweaks({ animation: id });
                  onReplay(id === "none" ? "stop" : "once");
                }}
              >
                {t(`tweaks.animations.${id}`)}
              </Choice>
            ))}
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title={t("tweaks.positionTitle")}
        summary={tweaks.position ? t(`tweaks.positions.${tweaks.position}`) : original}
        help={t("tweaks.positionHelp")}
      >
        <div
          role="radiogroup"
          aria-label={t("tweaks.positionTitle")}
          className="flex flex-col gap-2"
        >
          <OriginTile
            chosen={!tweaks.position}
            onClick={() => setTweaks({ position: undefined })}
            label={original}
          />
          <div className="grid grid-cols-3 gap-2">
            {TWEAK_POSITIONS.map((id) => (
              <Choice
                key={id}
                chosen={tweaks.position === id}
                onClick={() => setTweaks({ position: id })}
                className="flex-col gap-1.5 py-2 text-xs"
              >
                <PositionIcon position={id} />
                {t(`tweaks.positions.${id}`)}
              </Choice>
            ))}
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title={t("tweaks.outlineTitle")}
        summary={outline ? t(`tweaks.outlineSizes.${outline.size}`) : original}
        help={t("tweaks.outlineHelp")}
      >
        <div
          role="radiogroup"
          aria-label={t("tweaks.outlineTitle")}
          className="flex flex-col gap-2"
        >
          <OriginTile
            chosen={!outline}
            onClick={() => setTweaks({ outline: undefined })}
            label={original}
          />
          <div className="grid grid-cols-2 gap-2">
            {OUTLINE_SIZES.map((size) => (
              <Choice
                key={size}
                chosen={outline?.size === size}
                onClick={() =>
                  setTweaks({ outline: { size, color: outline?.color ?? DEFAULT_OUTLINE_COLOR } })
                }
              >
                {t(`tweaks.outlineSizes.${size}`)}
              </Choice>
            ))}
          </div>
        </div>
        {outline && outline.size !== "none" ? (
          <ColorField
            label={t("tweaks.outlineColor")}
            swatches={OUTLINE_SWATCHES}
            value={outline.color}
            custom={customColors}
            onChange={(color) => setTweaks({ outline: { ...outline, color } })}
            onAddCustom={onAddCustomColor}
            onRemoveCustom={onRemoveCustomColor}
          />
        ) : null}
      </AccordionSection>

      {hasColors || hasTweaks(tweaks) ? (
        <button
          type="button"
          onClick={onResetAll}
          className="border-border text-text-2 hover:text-text hover:border-brand-border focus-visible:ring-focus flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors outline-none focus-visible:ring-2"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          {t("tweaks.resetAll")}
        </button>
      ) : null}
    </>
  );
}
