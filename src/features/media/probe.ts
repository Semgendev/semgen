import { spawn } from "node:child_process";

import { z } from "zod";

const ffprobeOutputSchema = z.object({
  streams: z
    .array(
      z.object({
        codec_type: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
        avg_frame_rate: z.string().optional(),
        r_frame_rate: z.string().optional(),
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
};

function parseFrameRate(value: string | undefined): number | null {
  if (!value) return null;
  const [numerator, denominator] = value.split("/").map(Number);
  if (!numerator || !denominator) return null;
  const fps = numerator / denominator;
  return Number.isFinite(fps) && fps > 0 && fps < 1000 ? Math.round(fps * 1000) / 1000 : null;
}

export function parseFfprobeOutput(raw: unknown): MediaInfo {
  const output = ffprobeOutputSchema.parse(raw);
  const video = output.streams.find((stream) => stream.codec_type === "video");
  const duration = Number(output.format.duration);

  if (!Number.isFinite(duration) || duration <= 0) throw new Error("unreadable_duration");

  return {
    durationSeconds: Math.round(duration * 1000) / 1000,
    hasAudio: output.streams.some((stream) => stream.codec_type === "audio"),
    width: video?.width ?? null,
    height: video?.height ?? null,
    fps: parseFrameRate(video?.avg_frame_rate) ?? parseFrameRate(video?.r_frame_rate),
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
