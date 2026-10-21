import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";
import { Link } from "@/i18n/routing";

export async function AppHeader() {
  const t = await getTranslations("projects");

  return (
    <header className="border-border bg-bg/90 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <Link href="/" className="font-heading inline-flex min-h-11 items-center text-lg font-bold tracking-tight">
          SemGen
        </Link>
        <nav className="flex flex-1 items-center gap-1">
          <Link
            href="/projects"
            className="text-text-2 hover:text-text hover:bg-surface-2 inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors"
          >
            {t("myProjects")}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <UserNav />
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
