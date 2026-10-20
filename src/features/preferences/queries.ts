import type { SupabaseClient } from "@supabase/supabase-js";

import { customColorsSchema } from "./schemas";

// The custom colours of the signed-in user (row-level security returns only their own row).
export async function getCustomColors(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("custom_colors")
    .maybeSingle();
  if (error || !data) return [];
  const parsed = customColorsSchema.safeParse(data.custom_colors);
  return parsed.success ? parsed.data : [];
}
