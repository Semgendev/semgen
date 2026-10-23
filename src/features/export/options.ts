import { z } from "zod";

import { planAllows, type PlanId } from "@/features/billing/plans";

// What the user picks when exporting. 4K (and 60 images per second) belong to the Business plan
// (docs/DECISIONS.md D21), and 4K is only offered when the source video really is 4K.

export const EXPORT_FORMATS = ["original", "9:16", "1:1", "16:9"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

// How a video is put in a frame of another shape: cut its edges, or show it whole on a blurred
// copy of itself.
export const EXPORT_FITS = ["crop", "blur"] as const;
export type ExportFit = (typeof EXPORT_FITS)[number];

// Size of the short side of the exported video.
export const EXPORT_QUALITIES = ["720p", "1080p", "4k"] as const;
export type ExportQuality = (typeof EXPORT_QUALITIES)[number];

const SHORT_SIDE: Record<ExportQuality, number> = { "720p": 720, "1080p": 1080, "4k": 2160 };

export const exportOptionsSchema = z.object({
  format: z.enum(EXPORT_FORMATS),
  fit: z.enum(EXPORT_FITS),
  quality: z.enum(EXPORT_QUALITIES),
});
export type ExportOptions = z.infer<typeof exportOptionsSchema>;

// Width / height of a format, as a ratio (null = the source's own shape).
const RATIOS: Record<Exclude<ExportFormat, "original">, [number, number]> = {
  "9:16": [9, 16],
  "1:1": [1, 1],
  "16:9": [16, 9],
};

// Video encoders need even sizes.
function even(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

export function exportSize(
  options: Pick<ExportOptions, "format" | "quality">,
  source: { width: number; height: number },
): { width: number; height: number } {
  const [ratioW, ratioH] =
    options.format === "original" ? [source.width, source.height] : RATIOS[options.format];
  const short = SHORT_SIDE[options.quality];
  return ratioW <= ratioH
    ? { width: even(short), height: even((short * ratioH) / ratioW) }
    : { width: even((short * ratioW) / ratioH), height: even(short) };
}

// 4K only makes sense from a 4K source: below that, the picture is only blown up (for 4× the cost).
export function canExport4k(source: { width: number; height: number }): boolean {
  return Math.min(source.width, source.height) >= SHORT_SIDE["4k"];
}

// The captions are paid with the transcription (1 credit / minute, export included): only 4K adds
// 1 credit per started minute (docs/COSTS.md).
export function exportCost(quality: ExportQuality, durationSeconds: number): number {
  return quality === "4k" ? Math.max(1, Math.ceil(durationSeconds / 60)) : 0;
}

// Same shape as the source (within a hair): nothing to crop or blur.
export function fitMatters(
  format: ExportFormat,
  source: { width: number; height: number },
): boolean {
  if (format === "original") return false;
  const [ratioW, ratioH] = RATIOS[format];
  return Math.abs(source.width / source.height - ratioW / ratioH) > 0.02;
}

// What the panel offers for a given source and plan. A source too small for 4K comes first: a
// subscription would not change it, so it is never sold as an upgrade.
export function qualityState(
  quality: ExportQuality,
  source: { width: number; height: number },
  plan: PlanId,
): "ok" | "no_4k_source" | "locked" {
  if (quality !== "4k") return "ok";
  if (!canExport4k(source)) return "no_4k_source";
  return planAllows(plan, "4k") ? "ok" : "locked";
}

// Images per second of the exported video. 60 is a Business option, not wired to the render yet.
export const EXPORT_FPS_CHOICES = [30, 60] as const;
export type ExportFps = (typeof EXPORT_FPS_CHOICES)[number];

// Measured on 2026-10-22: 1 minute in 1080×1920 at 30 images per second ≈ 41 MB (docs/COSTS.md).
const MB_PER_PIXEL_MINUTE = 41 / (1080 * 1920);

// Rough size of the exported file, in megabytes, to tell the user before the export.
export function estimateSizeMb(
  size: { width: number; height: number },
  durationSeconds: number,
  fps: ExportFps,
): number {
  const mb = MB_PER_PIXEL_MINUTE * size.width * size.height * (durationSeconds / 60) * (fps / 30);
  return mb < 10 ? Math.max(0.1, Math.round(mb * 10) / 10) : Math.round(mb);
}
