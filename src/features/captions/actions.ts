"use server";

import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { PRESET_IDS } from "./presets";
import type { ProjectCaptionStyle } from "./project-style";

const inputSchema = z.object({ projectId: z.uuid(), preset: z.enum(PRESET_IDS) });

export type SetCaptionStyleResult =
  { ok: true } | { ok: false; code: "invalid" | "unauthorized" | "not_found" | "unknown" };

// Users can only rename their projects directly (column grant), so the style goes through the server.
export async function setCaptionStyle(
  projectId: string,
  preset: string,
): Promise<SetCaptionStyleResult> {
  const parsed = inputSchema.safeParse({ projectId, preset });
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, code: "unauthorized" };

  // Read as the user: RLS returns the project only if it belongs to them.
  const { data: owned, error: readError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  if (readError) return { ok: false, code: "unknown" };
  if (!owned) return { ok: false, code: "not_found" };

  const value: ProjectCaptionStyle = { preset: parsed.data.preset };
  const { error } = await createSupabaseAdminClient()
    .from("projects")
    .update({ caption_style: value })
    .eq("id", owned.id)
    .eq("user_id", auth.user.id);
  return error ? { ok: false, code: "unknown" } : { ok: true };
}
