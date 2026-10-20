import type { SupabaseClient } from "@supabase/supabase-js";

// Id of the signed-in user, read from the signed session token itself: no request to Supabase
// (getUser makes one each time). Row-level security and `user_id` filters still protect the data.
// Anything that spends money keeps using `auth.getUser()`, which also checks the account is still active.
export async function getSessionUserId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}
