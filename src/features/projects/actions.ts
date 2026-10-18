"use server";

import { tasks } from "@trigger.dev/sdk";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { projectIdSchema, projectTitleSchema } from "./schemas";
import { deleteProjectWithFiles, renameProject, type MutationResult } from "./service";

export type CreateProjectResult =
  { ok: true; id: string } | { ok: false; code: "invalid_title" | "unauthorized" | "unknown" };

export async function createProject(title: string): Promise<CreateProjectResult> {
  const parsed = projectTitleSchema.safeParse(title);
  if (!parsed.success) return { ok: false, code: "invalid_title" };

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, code: "unauthorized" };

  const { data, error } = await supabase
    .from("projects")
    .insert({ title: parsed.data })
    .select("id")
    .single();
  if (error || !data) return { ok: false, code: "unknown" };

  return { ok: true, id: projectIdSchema.parse(data.id) };
}

export type CompleteUploadResult = { ok: true } | { ok: false; code: "unauthorized" | "unknown" };

export async function completeUpload(projectId: string): Promise<CompleteUploadResult> {
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) return { ok: false, code: "unknown" };

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, code: "unauthorized" };

  const { error } = await supabase.rpc("mark_project_uploaded", { p_project_id: parsed.data });
  if (error) return { ok: false, code: "unknown" };

  // Best effort: if the queue is down, the project page asks again (see requestPreview).
  try {
    await tasks.trigger("create-video-preview", { projectId: parsed.data });
  } catch {
    // The preview stays "pending" and is retried when the project page opens.
  }
  return { ok: true };
}

export type RequestPreviewResult = { ok: true } | { ok: false; code: "unauthorized" | "unknown" };

// Starts (or restarts) the browser-safe preview of a project the caller owns.
// Safe to call twice: the task claims the project atomically and ignores a second run.
export async function requestPreview(projectId: string): Promise<RequestPreviewResult> {
  const parsed = projectIdSchema.safeParse(projectId);
  if (!parsed.success) return { ok: false, code: "unknown" };

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, code: "unauthorized" };

  // Ownership check through RLS: a foreign or missing project returns nothing.
  const { data: project } = await supabase
    .from("projects")
    .select("id, preview_status")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!project) return { ok: false, code: "unknown" };
  if (project.preview_status === "ready" || project.preview_status === "processing") {
    return { ok: true };
  }

  try {
    await tasks.trigger("create-video-preview", { projectId: parsed.data });
    return { ok: true };
  } catch {
    return { ok: false, code: "unknown" };
  }
}

export async function renameProjectAction(
  projectId: string,
  title: string,
): Promise<MutationResult> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, code: "unknown" };
  return renameProject(supabase, projectId, title);
}

export async function deleteProjectAction(projectId: string): Promise<MutationResult> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, code: "unknown" };
  return deleteProjectWithFiles(supabase, auth.user.id, projectId);
}
