import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_PATTERN, defaultLocale, locales } from "@/i18n/config";
import { refreshSession } from "@/lib/supabase/proxy";

// Picks the language: the one chosen before (NEXT_LOCALE cookie), else the device's
// (Accept-Language), else English.
const intlMiddleware = createMiddleware({ locales, defaultLocale });

const PROTECTED_PATH = new RegExp(`^/(${LOCALE_PATTERN})/(account|projects)(/|$)`);

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
  // every page except Next internals, monitoring and files (the matcher must stay static)
  matcher: ["/((?!api|_next|_vercel|monitoring|.*\\..*).*)"],
};
