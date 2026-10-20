"use server";

import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserId } from "@/lib/supabase/session";

import { captionColorsSchema } from "./colors";
import { captionMovesSchema } from "./moves";
import { PRESET_IDS } from "./presets";
import { captionTweaksSchema } from "./tweaks";
import type { ProjectCaptionStyle } from "./project-style";

const inputSchema = z.object({
  projectId: z.uuid(),
  preset: z.enum(PRESET_IDS),
  colors: captionColorsSchema.optional(),
  tweaks: captionTweaksSchema.optional(),
  moves: captionMovesSchema.optional(),
});

export type SetCaptionStyleResult =
  { ok: true } | { ok: false; code: "invalid" | "unauthorized" | "not_found" | "unknown" };

// Users can only rename their projects directly (column grant), so the style goes through the server.
export async function setCaptionStyle(
  projectId: string,
  preset: string,
  colors?: unknown,
  tweaks?: unknown,
  moves?: unknown,
): Promise<SetCaptionStyleResult> {
  const parsed = inputSchema.safeParse({ projectId, preset, colors, tweaks, moves });
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseServerClient();
  const userId = await getSessionUserId(supabase);
  if (!userId) return { ok: false, code: "unauthorized" };

  const value: ProjectCaptionStyle = {
    preset: parsed.data.preset,
    colors: parsed.data.colors,
    tweaks: parsed.data.tweaks,
    moves: parsed.data.moves,
  };
  // The `user_id` filter is the ownership check: another user's project matches no row.
  const { data, error } = await createSupabaseAdminClient()
    .from("projects")
    .update({ caption_style: value })
    .eq("id", parsed.data.projectId)
    .eq("user_id", userId)
    .select("id");
  if (error) return { ok: false, code: "unknown" };
  return data.length > 0 ? { ok: true } : { ok: false, code: "not_found" };
}
