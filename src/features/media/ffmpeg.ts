import { spawn } from "node:child_process";

export function runFfmpeg(args: string[], ffmpegPath = process.env.FFMPEG_PATH ?? "ffmpeg") {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, ["-hide_banner", "-loglevel", "error", ...args]);
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => (stderr = (stderr + chunk.toString()).slice(-2000)));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg_failed: ${stderr}`)),
    );
  });
}
