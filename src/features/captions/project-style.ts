import { z } from "zod";

import { CAPTION_PRESETS, DEFAULT_PRESET, PRESET_IDS, type PresetId } from "./presets";
import type { CaptionStyle } from "./style";

// What is stored in projects.caption_style. Only the preset for now; the user's adjustments
// (colours, font, position...) will be added here in T4.2.
export const projectCaptionStyleSchema = z.object({ preset: z.enum(PRESET_IDS) });
export type ProjectCaptionStyle = z.infer<typeof projectCaptionStyleSchema>;

export function resolveCaptionStyle(raw: unknown): { presetId: PresetId; style: CaptionStyle } {
  const parsed = projectCaptionStyleSchema.safeParse(raw);
  const presetId = parsed.success ? parsed.data.preset : DEFAULT_PRESET;
  return { presetId, style: CAPTION_PRESETS[presetId] };
}
