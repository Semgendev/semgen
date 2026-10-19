"use client";

import { ArrowLeft, Eye, EyeOff, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { CARD_LIGHTS, PRESET_IDS, type PresetId } from "./presets";
import { StyleCard, StyleStage } from "./style-card";
import type { CaptionStyle } from "./style";

// The rounded card that holds the left panel (the style panel, and the tabs around it in the studio).
export const PANEL_CARD =
  "bg-surface border-border flex min-h-0 flex-col overflow-hidden rounded-2xl border lg:h-full";

export type StylePanelText = {
  title: string;
  count: string;
  reset: string;
  settings: string;
  back: string;
  openSettings: string;
  livePreview: string;
  // the button next to "reset" that opens the settings of the chosen style
  personalize: string;
};

// The left panel: the gallery of styles, or (after the settings button) the settings of the chosen
// style. In the settings view the style's name and its looping animation stay pinned on top while
// only the settings below scroll.
export function StylePanel({
  text,
  selected,
  labelOf,
  styleOf,
  lightOf = (id) => CARD_LIGHTS[id],
  current,
  settingsOpen,
  onSettingsOpenChange,
  onSelect,
  onReset,
  resetDisabled,
  settings,
}: {
  text: StylePanelText;
  selected: PresetId;
  labelOf: (id: PresetId) => string;
  styleOf: (id: PresetId) => CaptionStyle;
  lightOf?: (id: PresetId) => string;
  current: CaptionStyle;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  onSelect: (id: PresetId) => void;
  onReset: () => void;
  resetDisabled: boolean;
  settings: ReactNode;
}) {
  // in the settings the preview rests (it would hide what is being changed); it plays under the pointer
  const [previewHover, setPreviewHover] = useState(false);
  // eye closed: the preview rests and plays under the pointer; eye open: it plays on its own
  const [live, setLive] = useState(false);
  return (
    <div
      role="group"
      aria-labelledby="caption-styles-title"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      {settingsOpen ? (
        <>
          <div className="border-border flex shrink-0 flex-col gap-3 border-b p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSettingsOpenChange(false)}
                aria-label={text.back}
                title={text.back}
                className="border-border text-text-2 hover:text-text hover:border-brand-border focus-visible:ring-focus flex size-8 shrink-0 items-center justify-center rounded-full border outline-none focus-visible:ring-2"
              >
                <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
              </button>
              <h2 id="caption-styles-title" className="truncate text-base font-semibold">
                {labelOf(selected)}
              </h2>
              <span className="text-text-3 ms-auto text-xs font-medium">{text.settings}</span>
              <button
                type="button"
                onClick={() => setLive((value) => !value)}
                aria-pressed={live}
                aria-label={text.livePreview}
                title={text.livePreview}
                className={cn(
                  "focus-visible:ring-focus flex size-8 shrink-0 items-center justify-center rounded-full border outline-none focus-visible:ring-2",
                  live
                    ? "border-brand bg-brand text-on-brand"
                    : "border-border text-text-2 hover:text-text hover:border-brand-border",
                )}
              >
                {live ? (
                  <Eye className="size-4" aria-hidden="true" />
                ) : (
                  <EyeOff className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <div
              onPointerEnter={() => setPreviewHover(true)}
              onPointerLeave={() => setPreviewHover(false)}
            >
              <StyleStage
                style={current}
                light={lightOf(selected)}
                playing={live || previewHover}
                resume
                className="border-border mx-auto max-w-60 rounded-xl border"
              />
            </div>
          </div>
          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain p-4">
            {settings}
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
          <div className="flex items-baseline justify-between gap-2 px-1 pt-1">
            <h2 id="caption-styles-title" className="text-base font-semibold">
              {text.title}
            </h2>
            <span className="text-text-3 text-xs font-medium tabular-nums">{text.count}</span>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => onSettingsOpenChange(true)}
              className="border-brand bg-brand/10 text-text hover:bg-brand/15 focus-visible:ring-focus flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-2"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              {text.personalize}
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={resetDisabled}
              className="border-border text-text-2 hover:text-text hover:border-brand-border focus-visible:ring-focus flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {text.reset}
            </button>
          </div>
          <div
            role="radiogroup"
            aria-labelledby="caption-styles-title"
            className="-mx-1 grid min-h-0 auto-rows-max grid-cols-2 gap-2.5 overflow-y-auto overscroll-contain p-1 xl:grid-cols-3"
          >
            {PRESET_IDS.map((id) => (
              <StyleCard
                key={id}
                style={styleOf(id)}
                name={labelOf(id)}
                light={lightOf(id)}
                selected={selected === id}
                settingsLabel={text.openSettings}
                onSelect={() => onSelect(id)}
                onOpenSettings={() => onSettingsOpenChange(true)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
