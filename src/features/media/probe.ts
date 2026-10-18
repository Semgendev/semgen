import { spawn } from "node:child_process";

import { z } from "zod";

const ffprobeOutputSchema = z.object({
  streams: z
    .array(
      z.object({
        codec_type: z.string(),
        codec_name: z.string().optional(),
        pix_fmt: z.string().optional(),
        color_transfer: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        avg_frame_rate: z.string().optional(),
        r_frame_rate: z.string().optional(),
        // Phones store portrait videos as landscape pixels plus a rotation flag.
        tags: z.object({ rotate: z.string().optional() }).optional(),
        side_data_list: z.array(z.object({ rotation: z.number().optional() })).optional(),
      }),
    )
    .default([]),
  format: z.object({ duration: z.string().optional() }).default({}),
});

export type MediaInfo = {
  durationSeconds: number;
  hasAudio: boolean;
  width: number | null;
  height: number | null;
  fps: number | null;
  videoCodec: string | null;
  pixelFormat: string | null;
  colorTransfer: string | null;
  audioCodec: string | null;
};

function parseFrameRate(value: string | undefined): number | null {
  if (!value) return null;
  const [numerator, denominator] = value.split("/").map(Number);
  if (!numerator || !denominator) return null;
  const fps = numerator / denominator;
  return Number.isFinite(fps) && fps > 0 && fps < 1000 ? Math.round(fps * 1000) / 1000 : null;
}

type RawVideoStream = z.infer<typeof ffprobeOutputSchema>["streams"][number];

function isQuarterTurn(video: RawVideoStream | undefined): boolean {
  if (!video) return false;
  const degrees =
    video.side_data_list?.find((entry) => entry.rotation !== undefined)?.rotation ??
    Number(video.tags?.rotate ?? 0);
  return Math.abs(Math.round(degrees)) % 180 === 90;
}

export function parseFfprobeOutput(raw: unknown): MediaInfo {
  const output = ffprobeOutputSchema.parse(raw);
  const video = output.streams.find((stream) => stream.codec_type === "video");
  const audio = output.streams.find((stream) => stream.codec_type === "audio");
  const duration = Number(output.format.duration);

  if (!Number.isFinite(duration) || duration <= 0) throw new Error("unreadable_duration");

  return {
    durationSeconds: Math.round(duration * 1000) / 1000,
    hasAudio: Boolean(audio),
    // Displayed size: swapped when the video is rotated by a quarter turn.
    width: (isQuarterTurn(video) ? video?.height : video?.width) ?? null,
    height: (isQuarterTurn(video) ? video?.width : video?.height) ?? null,
    fps: parseFrameRate(video?.avg_frame_rate) ?? parseFrameRate(video?.r_frame_rate),
    videoCodec: video?.codec_name ?? null,
    pixelFormat: video?.pix_fmt ?? null,
    colorTransfer: video?.color_transfer ?? null,
    audioCodec: audio?.codec_name ?? null,
  };
}

// Reads container metadata only (no decoding), straight from a signed URL.
export function probeMedia(url: string, ffprobePath = process.env.FFPROBE_PATH ?? "ffprobe") {
  return new Promise<MediaInfo>((resolve, reject) => {
    const child = spawn(ffprobePath, [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      url,
    ]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffprobe_failed: ${stderr.slice(0, 300)}`));
      try {
        resolve(parseFfprobeOutput(JSON.parse(stdout)));
      } catch (error) {
        reject(error);
      }
    });
  });
}
