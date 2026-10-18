import { setRequestLocale } from "next-intl/server";

import { HomeHero } from "@/components/home-hero";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 p-6">
      <header className="flex items-center justify-end gap-4">
        <UserNav />
        <LanguageSwitcher />
        <ThemeToggle />
      </header>
      <HomeHero />
    </main>
  );
}
