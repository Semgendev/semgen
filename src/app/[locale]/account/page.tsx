import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/features/auth/actions";
import { Link } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function AccountContent({ locale }: { locale: string }) {
  const t = await getTranslations("account");
  const tc = await getTranslations("credits");
  const tp = await getTranslations("projects");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/${locale}/login`);

  return (
    <Card>
      <CardHeader>
        <h1 className="text-2xl leading-none font-semibold">{t("title")}</h1>
        <CardDescription>
          {t("signedInAs")} <strong>{data.user.email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Link href="/projects/new" className={buttonVariants({ variant: "default" })}>
          {tp("newProject")}
        </Link>
        <Link href="/account/credits" className={buttonVariants({ variant: "outline" })}>
          {tc("viewHistory")}
        </Link>
        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="outline">
            {t("signOut")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center p-6">
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <AccountContent locale={locale} />
      </Suspense>
    </main>
  );
}
