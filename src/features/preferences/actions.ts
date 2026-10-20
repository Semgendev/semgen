"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUserId } from "@/lib/supabase/session";

import { customColorsSchema } from "./schemas";

export type SaveCustomColorsResult =
  { ok: true } | { ok: false; code: "invalid" | "unauthorized" | "unknown" };

// Replaces the user's list of custom colours. Written by the server only (the table is read-only
// for users), after validation.
export async function saveCustomColors(colors: unknown): Promise<SaveCustomColorsResult> {
  const parsed = customColorsSchema.safeParse(colors);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseServerClient();
  const userId = await getSessionUserId(supabase);
  if (!userId) return { ok: false, code: "unauthorized" };

  const { error } = await createSupabaseAdminClient()
    .from("user_preferences")
    .upsert(
      { user_id: userId, custom_colors: parsed.data, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  return error ? { ok: false, code: "unknown" } : { ok: true };
}
