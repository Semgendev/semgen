import { z } from "zod";

import { transcriptWordSchema } from "../../transcription/types";
import { paginate, type CaptionPage } from "../paginate";
import { resolveCaptionStyle } from "../project-style";
import type { StyleMoves } from "../moves";
import type { CaptionStyle } from "../style";

// What the export (Remotion Lambda) receives: the raw data of the project, exactly as stored. The
// style, the captions and the moved texts are worked out inside the render with the same code as
// the preview, so the exported video is the one the user saw.

export const EXPORT_COMPOSITION_ID = "captioned-video";
// The preview plays at 60 images per second; the export uses 30, the rate of most phone videos,
// which halves the render time (and its cost) with no visible loss.
export const EXPORT_FPS = 30;

export const exportPropsSchema = z.object({
  videoSrc: z.url(),
  words: z.array(transcriptWordSchema).max(50_000),
  // projects.caption_style as stored (checked by resolveCaptionStyle, which falls back on the default)
  captionStyle: z.unknown(),
  width: z.number().int().min(16).max(4096),
  height: z.number().int().min(16).max(4096),
  durationS: z.number().positive().max(3 * 60 * 60),
});
export type ExportProps = z.infer<typeof exportPropsSchema>;

export function exportCaptions(props: Pick<ExportProps, "words" | "captionStyle">): {
  style: CaptionStyle;
  pages: CaptionPage[];
  moves: StyleMoves | undefined;
} {
  const { presetId, style, moves } = resolveCaptionStyle(props.captionStyle);
  return { style, pages: paginate(props.words, style, presetId), moves: moves[presetId] };
}
