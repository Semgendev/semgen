import { NextResponse, type NextRequest } from "next/server";

import { localeSchema, safeNextPath } from "@/features/auth/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, context: { params: Promise<{ locale: string }> }) {
  const locale = localeSchema.parse((await context.params).locale);
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const next = safeNextPath(request.nextUrl.searchParams.get("next"), locale);
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL(`/${locale}/login?error=link`, request.url));
}
