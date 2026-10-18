import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/login-form";
import { safeNextPath } from "@/features/auth/schemas";

async function LoginContent({
  locale,
  searchParams,
}: {
  locale: string;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <LoginForm
      locale={locale}
      next={next ? safeNextPath(next, locale) : undefined}
      linkError={error === "link"}
    />
  );
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <h1 className="text-2xl leading-none font-semibold">{t("title")}</h1>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <LoginContent locale={locale} searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
