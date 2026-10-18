import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { getSupabasePublicEnv } from "./env";

// Refreshes the auth cookies on `response` and returns whether a user is signed in.
export async function refreshSession(request: NextRequest, response: NextResponse) {
  const env = getSupabasePublicEnv();
  if (!env) return { isSignedIn: false };

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  return { isSignedIn: Boolean(data?.claims) };
}
