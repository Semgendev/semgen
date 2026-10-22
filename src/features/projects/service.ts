import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { deleteWorkingCopy } from "@/lib/aws/working-copy-storage";

import { projectIdSchema, projectTitleSchema } from "./schemas";

export const projectStatusSchema = z.enum([
  "uploading",
  "uploaded",
  "processing",
  "ready",
  "failed",
]);

export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const previewStatusSchema = z.enum(["pending", "processing", "ready", "failed"]);

export type PreviewStatus = z.infer<typeof previewStatusSchema>;

export const projectSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  status: projectStatusSchema,
  source_video_key: z.string().nullable(),
  preview_status: previewStatusSchema,
  preview_video_key: z.string().nullable(),
  source_size_bytes: z.number().nullable(),
  duration_s: z.number().nullable(),
  detected_language: z.string().nullable(),
  created_at: z.string(),
  // validated by features/captions/project-style.ts when used
  caption_style: z.unknown().optional(),
});

export type ProjectSummary = z.infer<typeof projectSummarySchema>;

const COLUMNS =
  "id, title, status, source_video_key, preview_status, preview_video_key, source_size_bytes, duration_s, detected_language, created_at, caption_style";

const SIGNED_URL_SECONDS = 60 * 60;

export function parseProjects(rows: unknown): ProjectSummary[] {
  return z.array(projectSummarySchema).parse(rows);
}

export async function listProjects(supabase: SupabaseClient, limit = 100) {
  const { data, error } = await supabase
    .from("projects")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return parseProjects(data);
}

export async function getProject(supabase: SupabaseClient, projectId: string) {
  const id = projectIdSchema.safeParse(projectId);
  if (!id.success) return null;

  const { data, error } = await supabase
    .from("projects")
    .select(COLUMNS)
    .eq("id", id.data)
    .maybeSingle();
  if (error) throw error;
  return data ? projectSummarySchema.parse(data) : null;
}

// Short-lived read links for the private bucket, one per project whose browser-safe preview is
// ready. The original file is never played in the browser (it may be HEVC, HDR, .mov...).
export async function getVideoUrls(
  supabase: SupabaseClient,
  projects: ProjectSummary[],
): Promise<Record<string, string>> {
  const playable = projects.filter(
    (project) => project.preview_status === "ready" && project.preview_video_key,
  );
  if (playable.length === 0) return {};

  const { data, error } = await supabase.storage.from("videos").createSignedUrls(
    playable.map((project) => project.preview_video_key as string),
    SIGNED_URL_SECONDS,
  );
  if (error || !data) return {};

  const urls: Record<string, string> = {};
  playable.forEach((project, index) => {
    const signed = data[index]?.signedUrl;
    if (signed) urls[project.id] = signed;
  });
  return urls;
}

export type MutationResult =
  { ok: true } | { ok: false; code: "invalid" | "not_found" | "unknown" };

export async function renameProject(
  supabase: SupabaseClient,
  projectId: string,
  title: string,
): Promise<MutationResult> {
  const id = projectIdSchema.safeParse(projectId);
  const parsedTitle = projectTitleSchema.safeParse(title);
  if (!id.success || !parsedTitle.success) return { ok: false, code: "invalid" };

  const { data, error } = await supabase
    .from("projects")
    .update({ title: parsedTitle.data })
    .eq("id", id.data)
    .select("id");
  if (error) return { ok: false, code: "unknown" };
  return data.length === 0 ? { ok: false, code: "not_found" } : { ok: true };
}

// Removes the video files first, then the row: a failed storage call leaves the project intact.
export async function deleteProjectWithFiles(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<MutationResult> {
  const id = projectIdSchema.safeParse(projectId);
  if (!id.success) return { ok: false, code: "invalid" };

  // The working copy lives on S3: removed first, like the Storage files.
  const { data: owned } = await supabase
    .from("projects")
    .select("working_video_key")
    .eq("id", id.data)
    .maybeSingle();
  if (owned?.working_video_key) {
    try {
      await deleteWorkingCopy(String(owned.working_video_key));
    } catch {
      return { ok: false, code: "unknown" };
    }
  }

  const folder = `${userId}/${id.data}`;
  const { data: files, error: listError } = await supabase.storage.from("videos").list(folder);
  if (listError) return { ok: false, code: "unknown" };

  if (files.length > 0) {
    const { error: removeError } = await supabase.storage
      .from("videos")
      .remove(files.map((file) => `${folder}/${file.name}`));
    if (removeError) return { ok: false, code: "unknown" };
  }

  const { data, error } = await supabase.from("projects").delete().eq("id", id.data).select("id");
  if (error) return { ok: false, code: "unknown" };
  return data.length === 0 ? { ok: false, code: "not_found" } : { ok: true };
}
