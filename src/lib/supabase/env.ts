import { z } from "zod";

const publicEnvSchema = z.object({
  url: z.url(),
  publishableKey: z.string().min(1),
});

export type SupabasePublicEnv = z.infer<typeof publicEnvSchema>;

// Returns null when Supabase is not configured (e.g. CI builds), so callers can degrade gracefully.
export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const parsed = publicEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return parsed.success ? parsed.data : null;
}
