"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ColorRow } from "./color-row";
import type { CaptionColors } from "./colors";
import { loadPreviewFont, previewFamily } from "./fonts";
import { ACCENT_SWATCHES, DEFAULT_OUTLINE_COLOR, OUTLINE_SWATCHES, TEXT_SWATCHES } from "./presets";
import { FONT_IDS, type FontId } from "./style";
import {
  OUTLINE_SIZES,
  TWEAK_ANIMATIONS,
  TWEAK_POSITIONS,
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

// One group of settings: a title, one line that says what it does, then the choices.
function Group({
  id,
  title,
  help,
  children,
}: {
  id: string;
  title: string;
  help: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <h3 id={id} className="text-sm font-semibold">
          {title}
        </h3>
        <p className="text-text-3 text-xs leading-snug">{help}</p>
      </div>
      {children}
    </section>
  );
}

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
        "focus-visible:ring-focus flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2",
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

export type SettingsPanelProps = {
  colors: CaptionColors;
  tweaks: CaptionTweaks;
  onColors: (colors: CaptionColors) => void;
  onTweaks: (tweaks: CaptionTweaks) => void;
  onResetAll: () => void;
  changed: boolean;
};

// The settings of the chosen style, in plain words: colours, font, how the text comes in, where it
// sits, its outline. Every change shows at once on the video and is saved.
export function SettingsPanel({
  colors,
  tweaks,
  onColors,
  onTweaks,
  onResetAll,
  changed,
}: SettingsPanelProps) {
  const t = useTranslations("captions");
  const hasColors = Boolean(colors.text || colors.accent);

  // the fonts are written in themselves: fetch their letters when the settings open
  useEffect(() => {
    for (const id of FONT_IDS) loadPreviewFont(id);
  }, []);

  function setTweak<K extends keyof CaptionTweaks>(key: K, value: CaptionTweaks[K] | undefined) {
    const next = { ...tweaks };
    if (value === undefined) delete next[key];
    else next[key] = value;
    onTweaks(next);
  }

  return (
    <>
      <Group id="set-colors" title={t("colorsTitle")} help={t("colorsHelp")}>
        <ColorRow
          label={t("textColor")}
          swatches={TEXT_SWATCHES}
          value={colors.text}
          onChange={(text) => onColors({ ...colors, text })}
        />
        <ColorRow
          label={t("accentColor")}
          swatches={ACCENT_SWATCHES}
          value={colors.accent}
          onChange={(accent) => onColors({ ...colors, accent })}
        />
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
      </Group>

      <Group id="set-font" title={t("tweaks.fontTitle")} help={t("tweaks.fontHelp")}>
        <div role="radiogroup" aria-labelledby="set-font" className="grid grid-cols-2 gap-2">
          <Choice
            chosen={!tweaks.font}
            onClick={() => setTweak("font", undefined)}
            className="col-span-2"
          >
            {t("tweaks.original")}
          </Choice>
          {FONT_IDS.map((id) => (
            <Choice
              key={id}
              chosen={tweaks.font === id}
              onClick={() => setTweak("font", id)}
              className="min-h-12 text-base"
              style={{ fontFamily: previewFamily(id), fontWeight: 700 }}
            >
              {FONT_NAMES[id]}
            </Choice>
          ))}
        </div>
      </Group>

      <Group id="set-animation" title={t("tweaks.animationTitle")} help={t("tweaks.animationHelp")}>
        <div role="radiogroup" aria-labelledby="set-animation" className="grid grid-cols-2 gap-2">
          <Choice
            chosen={!tweaks.animation}
            onClick={() => setTweak("animation", undefined)}
            className="col-span-2"
          >
            {t("tweaks.original")}
          </Choice>
          {TWEAK_ANIMATIONS.map((id) => (
            <Choice
              key={id}
              chosen={tweaks.animation === id}
              onClick={() => setTweak("animation", id)}
            >
              {t(`tweaks.animations.${id}`)}
            </Choice>
          ))}
        </div>
      </Group>

      <Group id="set-position" title={t("tweaks.positionTitle")} help={t("tweaks.positionHelp")}>
        <div role="radiogroup" aria-labelledby="set-position" className="grid grid-cols-4 gap-2">
          <Choice
            chosen={!tweaks.position}
            onClick={() => setTweak("position", undefined)}
            className="h-full text-xs"
          >
            {t("tweaks.original")}
          </Choice>
          {TWEAK_POSITIONS.map((id) => (
            <Choice
              key={id}
              chosen={tweaks.position === id}
              onClick={() => setTweak("position", id)}
              className="flex-col gap-1.5 py-2 text-xs"
            >
              <PositionIcon position={id} />
              {t(`tweaks.positions.${id}`)}
            </Choice>
          ))}
        </div>
      </Group>

      <Group id="set-outline" title={t("tweaks.outlineTitle")} help={t("tweaks.outlineHelp")}>
        <div role="radiogroup" aria-labelledby="set-outline" className="grid grid-cols-2 gap-2">
          <Choice
            chosen={!tweaks.outline}
            onClick={() => setTweak("outline", undefined)}
            className="col-span-2"
          >
            {t("tweaks.original")}
          </Choice>
          {OUTLINE_SIZES.map((size) => (
            <Choice
              key={size}
              chosen={tweaks.outline?.size === size}
              onClick={() =>
                setTweak("outline", { size, color: tweaks.outline?.color ?? DEFAULT_OUTLINE_COLOR })
              }
              className={size === "none" ? "col-span-2" : undefined}
            >
              {t(`tweaks.outlineSizes.${size}`)}
            </Choice>
          ))}
        </div>
        {tweaks.outline && tweaks.outline.size !== "none" ? (
          <ColorRow
            label={t("tweaks.outlineColor")}
            swatches={OUTLINE_SWATCHES}
            value={tweaks.outline.color}
            onChange={(color) =>
              setTweak("outline", { size: tweaks.outline?.size ?? "thin", color })
            }
          />
        ) : null}
      </Group>

      {changed ? (
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
