"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { isDisposableEmail } from "./disposable-domains";
import { localeSchema, magicLinkSchema, safeNextPath } from "./schemas";

export type MagicLinkState =
  | { status: "idle" }
  | { status: "sent" }
  | {
      status: "error";
      code: "invalid_email" | "disposable_email" | "captcha" | "rate_limited" | "unknown";
    };

export async function sendMagicLink(
  _previous: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const parsed = magicLinkSchema.safeParse({
    email: formData.get("email"),
    locale: formData.get("locale"),
    next: formData.get("next") ?? undefined,
    captchaToken: formData.get("cf-turnstile-response") ?? undefined,
  });
  if (!parsed.success) return { status: "error", code: "invalid_email" };

  const { email, locale, next, captchaToken } = parsed.data;
  if (isDisposableEmail(email)) return { status: "error", code: "disposable_email" };

  // Server Actions already reject cross-origin requests, so the Origin header is trustworthy here.
  const origin = (await headers()).get("origin");
  if (!origin) return { status: "error", code: "unknown" };

  const callback = new URL(`/${locale}/auth/callback`, origin);
  callback.searchParams.set("next", safeNextPath(next, locale));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callback.toString(),
      captchaToken,
      shouldCreateUser: true,
      data: { locale },
    },
  });

  if (!error) return { status: "sent" };
  if (error.status === 429) return { status: "error", code: "rate_limited" };
  if (error.code === "captcha_failed") return { status: "error", code: "captcha" };
  return { status: "error", code: "unknown" };
}

export async function signOut(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale"));
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}

export async function signInWithGoogle(formData: FormData) {
  const locale = localeSchema.parse(formData.get("locale"));
  const next = safeNextPath(formData.get("next")?.toString(), locale);

  const origin = (await headers()).get("origin");
  if (!origin) redirect(`/${locale}/login?error=link`);

  const callback = new URL(`/${locale}/auth/callback`, origin);
  callback.searchParams.set("next", next);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });

  if (error || !data.url) redirect(`/${locale}/login?error=link`);
  redirect(data.url);
}
