import { z } from "zod";

import { applyColors, captionColorsSchema, type CaptionColors } from "./colors";
import { captionTweaksSchema, applyTweaks, type CaptionTweaks } from "./tweaks";
import { CAPTION_PRESETS, DEFAULT_PRESET, PRESET_IDS, type PresetId } from "./presets";
import type { CaptionStyle } from "./style";

// What is stored in projects.caption_style: the chosen preset, the user's two colours (text, key
// word) and the other adjustments (font, animation, position, outline). Old rows have no `tweaks`.
export const projectCaptionStyleSchema = z.object({
  preset: z.enum(PRESET_IDS),
  colors: captionColorsSchema.optional(),
  tweaks: captionTweaksSchema.optional(),
});
export type ProjectCaptionStyle = z.infer<typeof projectCaptionStyleSchema>;

export function resolveCaptionStyle(raw: unknown): {
  presetId: PresetId;
  colors: CaptionColors;
  tweaks: CaptionTweaks;
  style: CaptionStyle;
} {
  const parsed = projectCaptionStyleSchema.safeParse(raw);
  const presetId = parsed.success ? parsed.data.preset : DEFAULT_PRESET;
  const colors = (parsed.success ? parsed.data.colors : undefined) ?? {};
  const tweaks = (parsed.success ? parsed.data.tweaks : undefined) ?? {};
  return {
    presetId,
    colors,
    tweaks,
    style: applyTweaks(applyColors(CAPTION_PRESETS[presetId], colors), tweaks),
  };
}
