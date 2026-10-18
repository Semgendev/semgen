import type { MediaInfo } from "./probe";

// Short side of the preview, in pixels. Enough for editing; keeps files small and fast to start.
export const PREVIEW_SHORT_SIDE = 720;

const SAFE_AUDIO_CODECS = new Set(["aac", "mp3"]);
const HDR_TRANSFERS = new Set(["arib-std-b67", "smpte2084"]);

// True when every mainstream browser (Chrome, Edge, Firefox, Safari, iOS) plays the file as is:
// an .mp4 with 8-bit H.264 video and AAC/MP3 (or no) audio. Everything else gets a converted copy.
export function isBrowserSafe(info: MediaInfo, sourceKey: string): boolean {
  if (!sourceKey.toLowerCase().endsWith(".mp4")) return false;
  if (info.videoCodec !== "h264") return false;
  if (info.pixelFormat !== "yuv420p") return false;
  if (info.audioCodec !== null && !SAFE_AUDIO_CODECS.has(info.audioCodec)) return false;
  return !isHdr(info);
}

export function isHdr(info: MediaInfo): boolean {
  return info.colorTransfer !== null && HDR_TRANSFERS.has(info.colorTransfer);
}

// iPhone videos are often HDR (HLG): without tone mapping their colours look washed out in SDR.
const HDR_TO_SDR =
  "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0," +
  "zscale=t=bt709:m=bt709:r=tv,format=yuv420p";

export function buildPreviewArgs(input: string, output: string, info: MediaInfo): string[] {
  const side = PREVIEW_SHORT_SIDE;
  // Downscale only (never upscale); -2 keeps the other side even, as H.264 requires.
  const scale = `scale='if(gt(iw,ih),-2,min(${side},iw))':'if(gt(iw,ih),min(${side},ih),-2)'`;
  const filters = isHdr(info) ? `${HDR_TO_SDR},${scale}` : `${scale},format=yuv420p`;

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
    "veryfast",
    "-crf",
    "26",
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    ...(info.hasAudio ? ["-c:a", "aac", "-b:a", "128k", "-ac", "2"] : []),
    "-movflags",
    "+faststart",
    output,
  ];
}
