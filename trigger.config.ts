import { ffmpeg } from "@trigger.dev/build/extensions/core";
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_cufdcyzzcdrndjgsbnxy",
  dirs: ["./src/trigger"],
  maxDuration: 60 * 30,
  build: {
    // Installs ffmpeg/ffprobe in the deployed worker and sets FFPROBE_PATH.
    extensions: [ffmpeg()],
  },
});
