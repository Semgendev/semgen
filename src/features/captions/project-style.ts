import { z } from "zod";

import { applyColors, captionColorsSchema, type CaptionColors } from "./colors";
import { CAPTION_PRESETS, DEFAULT_PRESET, PRESET_IDS, type PresetId } from "./presets";
import type { CaptionStyle } from "./style";

// What is stored in projects.caption_style: the chosen preset and the user's two colours (text,
// key word). Other adjustments (font, position...) will be added here in T4.2.
export const projectCaptionStyleSchema = z.object({
  preset: z.enum(PRESET_IDS),
  colors: captionColorsSchema.optional(),
});
export type ProjectCaptionStyle = z.infer<typeof projectCaptionStyleSchema>;

export function resolveCaptionStyle(raw: unknown): {
  presetId: PresetId;
  colors: CaptionColors;
  style: CaptionStyle;
} {
  const parsed = projectCaptionStyleSchema.safeParse(raw);
  const presetId = parsed.success ? parsed.data.preset : DEFAULT_PRESET;
  const colors = (parsed.success ? parsed.data.colors : undefined) ?? {};
  return { presetId, colors, style: applyColors(CAPTION_PRESETS[presetId], colors) };
}
