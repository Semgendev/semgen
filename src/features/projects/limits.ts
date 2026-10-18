// 50 MB is the Supabase free-plan ceiling (also enforced by the `videos` bucket).
// Raise it, together with the bucket limit, when storage moves to R2.
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 180;

export const VIDEO_CONTENT_TYPES = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
} as const;

export type VideoExtension = keyof typeof VIDEO_CONTENT_TYPES;

export type VideoValidationError = "empty" | "unsupported_type" | "too_large" | "too_long";

export type VideoFileCheck =
  | { ok: true; extension: VideoExtension; contentType: string }
  | { ok: false; error: VideoValidationError };

function extensionOf(fileName: string): VideoExtension | null {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return extension in VIDEO_CONTENT_TYPES ? (extension as VideoExtension) : null;
}

export function validateVideoFile(file: { name: string; size: number }): VideoFileCheck {
  const extension = extensionOf(file.name);
  if (!extension) return { ok: false, error: "unsupported_type" };
  if (file.size <= 0) return { ok: false, error: "empty" };
  if (file.size > MAX_VIDEO_BYTES) return { ok: false, error: "too_large" };
  return { ok: true, extension, contentType: VIDEO_CONTENT_TYPES[extension] };
}

export function validateVideoDuration(seconds: number | null): VideoValidationError | null {
  if (seconds !== null && seconds > MAX_VIDEO_SECONDS) return "too_long";
  return null;
}

export function defaultProjectTitle(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^./\\]+$/, "").trim();
  return (withoutExtension || "Video").slice(0, 120);
}
