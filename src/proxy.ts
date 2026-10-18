import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, locales } from "@/i18n/config";
import { refreshSession } from "@/lib/supabase/proxy";

const intlMiddleware = createMiddleware({ locales, defaultLocale });

const PROTECTED_PATH = /^\/(en|fr)\/(account|projects)(\/|$)/;

export default async function proxy(request: NextRequest) {
  const response = intlMiddleware(request);
  const { isSignedIn } = await refreshSession(request, response);

  const match = PROTECTED_PATH.exec(request.nextUrl.pathname);
  if (match && !isSignedIn) {
    const loginUrl = new URL(`/${match[1]}/login`, request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    const redirect = NextResponse.redirect(loginUrl);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/", "/(en|fr)/:path*", "/((?!_next|_vercel|monitoring|.*\..*).*)"],
};
