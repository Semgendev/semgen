import { workingCopySize } from "@/features/media/working-copy";

import { exportSize, type ExportOptions } from "./options";

// Which file the render reads: the 1080p working copy (cheaper, same picture) or the original.
// The copy is used only when it has at least as many pixels as the video will show in the
// export, so the exported picture is never softer than the original would give.
export function chooseRenderSource(
  options: ExportOptions,
  source: { width: number; height: number },
  hasWorkingCopy: boolean,
): "working" | "original" {
  if (!hasWorkingCopy || options.quality === "4k") return "original";

  const copy = workingCopySize(source);
  const frame = exportSize(options, source);
  // "crop" fills the frame (the larger ratio); "blur" shows the whole video (the smaller one).
  const ratios = [frame.width / source.width, frame.height / source.height];
  const shown = options.fit === "crop" ? Math.max(...ratios) : Math.min(...ratios);
  const available = copy.width / source.width;
  return available + 1e-6 >= shown ? "working" : "original";
}
