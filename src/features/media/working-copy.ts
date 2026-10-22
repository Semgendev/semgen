import { HDR_TO_SDR, isHdr } from "./preview";
import type { MediaInfo } from "./probe";

// Short side of the working copy: the export is capped at 1080p unless the user picks 4K,
// and 4K exports read the original instead.
export const WORKING_COPY_SHORT_SIDE = 1080;

const COPYABLE_AUDIO_CODECS = new Set(["aac"]);

// A copy only helps when the original is heavy to decode (HEVC, 10-bit, HDR, 4K...). An 8-bit
// H.264 mp4 of 1080p or less is already what the copy would be: keep the original (free).
export function needsWorkingCopy(info: MediaInfo, sourceKey: string): boolean {
  if (!info.width || !info.height) return false;
  if (!sourceKey.toLowerCase().endsWith(".mp4")) return true;
  if (info.videoCodec !== "h264" || info.pixelFormat !== "yuv420p" || isHdr(info)) return true;
  return Math.min(info.width, info.height) > WORKING_COPY_SHORT_SIDE;
}

// Size of the copy: the short side is capped at 1080 and a video is never enlarged.
export function workingCopySize(source: { width: number; height: number }): {
  width: number;
  height: number;
} {
  const scale = Math.min(1, WORKING_COPY_SHORT_SIDE / Math.min(source.width, source.height));
  const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);
  return { width: even(source.width * scale), height: even(source.height * scale) };
}

// Visually lossless (CRF 18) with one key frame per second, so each Lambda machine can jump to
// its part of the video quickly. HDR is tone-mapped exactly like the preview.
export function buildWorkingCopyArgs(input: string, output: string, info: MediaInfo): string[] {
  const side = WORKING_COPY_SHORT_SIDE;
  const scale = `scale='if(gt(iw,ih),-2,min(${side},iw))':'if(gt(iw,ih),min(${side},ih),-2)'`;
  const filters = isHdr(info) ? `${HDR_TO_SDR},${scale}` : `${scale},format=yuv420p`;
  const keyInterval = Math.max(1, Math.round(info.fps ?? 30));
  const copyAudio = info.audioCodec !== null && COPYABLE_AUDIO_CODECS.has(info.audioCodec);

  return [
    "-y",
    "-i",
    input,
    "-map",
    "0:v:0",
    ...(info.hasAudio ? ["-map", "0:a:0"] : []),
    "-vf",
    filters,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    "-g",
    String(keyInterval),
    "-colorspace",
    "bt709",
    "-color_primaries",
    "bt709",
    "-color_trc",
    "bt709",
    ...(info.hasAudio ? (copyAudio ? ["-c:a", "copy"] : ["-c:a", "aac", "-b:a", "192k"]) : []),
    "-movflags",
    "+faststart",
    output,
  ];
}
