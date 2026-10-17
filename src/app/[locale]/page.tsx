import { HomeHero } from "@/components/home-hero";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 p-6">
      <header className="flex justify-end gap-4">
        <LanguageSwitcher />
        <ThemeToggle />
      </header>
      <HomeHero />
    </main>
  );
}
