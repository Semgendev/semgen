import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const adminEnvSchema = z.object({
  url: z.url(),
  secretKey: z.string().min(1),
});

// Bypasses RLS. Server and background workers only: never import this from a client component.
export function createSupabaseAdminClient(): SupabaseClient {
  const env = adminEnvSchema.parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    secretKey: process.env.SUPABASE_SECRET_KEY,
  });
  return createClient(env.url, env.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
