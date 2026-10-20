import { z } from "zod";

import { applyColors, captionColorsSchema, type CaptionColors } from "./colors";
import { captionMovesSchema, type CaptionMoves } from "./moves";
import { captionTweaksSchema, applyTweaks, type CaptionTweaks } from "./tweaks";
import { CAPTION_PRESETS, DEFAULT_PRESET, PRESET_IDS, type PresetId } from "./presets";
import type { CaptionStyle } from "./style";

// What is stored in projects.caption_style: the chosen preset, the user's two colours (text, key
// word), the other adjustments (font, animation, position, outline) and the texts moved by hand on
// the video, per style. Old rows have no `tweaks` nor `moves`.
export const projectCaptionStyleSchema = z.object({
  preset: z.enum(PRESET_IDS),
  colors: captionColorsSchema.optional(),
  tweaks: captionTweaksSchema.optional(),
  // a broken move is dropped on its own: it never costs the user their style and colours
  moves: captionMovesSchema.optional().catch(undefined),
});
export type ProjectCaptionStyle = z.infer<typeof projectCaptionStyleSchema>;

export function resolveCaptionStyle(raw: unknown): {
  presetId: PresetId;
  colors: CaptionColors;
  tweaks: CaptionTweaks;
  moves: CaptionMoves;
  style: CaptionStyle;
} {
  const parsed = projectCaptionStyleSchema.safeParse(raw);
  const presetId = parsed.success ? parsed.data.preset : DEFAULT_PRESET;
  const colors = (parsed.success ? parsed.data.colors : undefined) ?? {};
  const tweaks = (parsed.success ? parsed.data.tweaks : undefined) ?? {};
  const moves = (parsed.success ? parsed.data.moves : undefined) ?? {};
  return {
    presetId,
    colors,
    tweaks,
    moves,
    style: applyTweaks(applyColors(CAPTION_PRESETS[presetId], colors), tweaks),
  };
}
