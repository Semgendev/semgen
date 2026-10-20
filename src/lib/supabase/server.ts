import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import { getSupabasePublicEnv } from "./env";

// One client per request: the layout, the header and the page share it (and its cached answers).
export const createSupabaseServerClient = cache(async () => {
  const env = getSupabasePublicEnv();
  if (!env) throw new Error("Supabase is not configured");

  const cookieStore = await cookies();

  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: the proxy refreshes the session cookies instead.
        }
      },
    },
  });
});
