"use server";

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
  return error ? { ok: false, code: "unknown" } : { ok: true };
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
