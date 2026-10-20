import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCreditBalance, getCreditHistory } from "@/features/credits/queries";
import { Link } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function CreditsContent({ locale }: { locale: string }) {
  const t = await getTranslations("credits");
  const format = await getFormatter();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/${locale}/login?next=/${locale}/account/credits`);

  const [balance, history] = await Promise.all([
    getCreditBalance(supabase),
    getCreditHistory(supabase),
  ]);

  return (
    <Card>
      <CardHeader>
        <h1 className="text-2xl leading-none font-semibold">{t("title")}</h1>
        <CardDescription>{t("currentBalance", { count: balance })}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {history.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-border divide-y">
            {history.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex flex-col">
                  <span className="font-medium">{t(`reasons.${entry.reason}`)}</span>
                  <time dateTime={entry.created_at} className="text-muted-foreground text-sm">
                    {format.dateTime(new Date(entry.created_at), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>
                <span className={entry.delta > 0 ? "text-success font-semibold" : "font-semibold"}>
                  {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/account" className="text-primary text-sm underline-offset-4 hover:underline">
          {t("back")}
        </Link>
      </CardContent>
    </Card>
  );
}

export default async function CreditsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center p-4 sm:p-6">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <CreditsContent locale={locale} />
      </Suspense>
    </main>
  );
}
