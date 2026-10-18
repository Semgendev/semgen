import { getTranslations, setRequestLocale } from "next-intl/server";

import { AppearanceSettings } from "@/features/appearance/appearance-settings";
import { Link } from "@/i18n/routing";

export default async function AppearancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("appearance");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 p-6 sm:py-12">
      <div className="flex flex-col gap-2">
        <p className="text-text-3 text-sm font-medium">{t("breadcrumb")}</p>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-text-2">{t("subtitle")}</p>
      </div>
      <AppearanceSettings />
      <Link href="/account" className="text-brand-text text-sm underline-offset-4 hover:underline">
        {t("back")}
      </Link>
    </main>
  );
}
