"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { cn } from "@/lib/utils";

import { setCaptionStyle } from "./actions";
import { CaptionPlayer } from "./caption-player";
import { CAPTION_PRESETS, PRESET_IDS, type PresetId } from "./presets";

// The video with its captions and the choice of style. The choice applies at once and is saved
// in the background (the live gallery with previews on the user's own video comes next).
export function CaptionStudio({
  projectId,
  src,
  initialPreset,
}: {
  projectId: string;
  src: string;
  initialPreset: PresetId;
}) {
  const t = useTranslations("captions");
  const [preset, setPreset] = useState<PresetId>(initialPreset);
  const [failed, setFailed] = useState(false);
  const [, startSaving] = useTransition();

  function choose(next: PresetId) {
    setPreset(next);
    setFailed(false);
    startSaving(async () => {
      const result = await setCaptionStyle(projectId, next);
      if (!result.ok) setFailed(true);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <CaptionPlayer src={src} style={CAPTION_PRESETS[preset]} />
      <section aria-labelledby="caption-styles-title" className="flex flex-col gap-2">
        <h2 id="caption-styles-title" className="text-base font-semibold">
          {t("stylesTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PRESET_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={preset === id}
              onClick={() => choose(id)}
              className={cn(
                "border-border bg-surface hover:border-brand-border focus-visible:ring-ring flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2",
                preset === id && "border-brand bg-brand/10 text-brand-text",
              )}
            >
              {t(`styles.${id}`)}
              {preset === id ? <Check className="size-4" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
        {failed ? (
          <p role="alert" className="text-danger text-sm">
            {t("saveFailed")}
          </p>
        ) : null}
      </section>
    </div>
  );
}
