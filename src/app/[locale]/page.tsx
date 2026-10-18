import { getTranslations, setRequestLocale } from "next-intl/server";

import { HomeHero } from "@/components/home-hero";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 p-6">
      <header className="flex items-center justify-end gap-4">
        <Link href="/account" className={buttonVariants({ variant: "ghost" })}>
          {t("signIn")}
        </Link>
        <LanguageSwitcher />
        <ThemeToggle />
      </header>
      <HomeHero />
    </main>
  );
}
