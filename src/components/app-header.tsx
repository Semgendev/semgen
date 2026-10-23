import { getTranslations } from "next-intl/server";

import { ThemeToggle } from "@/components/theme-toggle";
import { EditorToolbarSlot } from "@/features/projects/editor-toolbar";
import { UserNav } from "@/components/user-nav";
import { Link } from "@/i18n/routing";

export async function AppHeader() {
  const t = await getTranslations("projects");

  return (
    <header className="border-border bg-bg/90 sticky top-0 z-30 border-b backdrop-blur">
      {/* Full width: the buttons sit near the right edge of the screen, right where the export panel opens. */}
      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <Link
          href="/"
          className="font-heading inline-flex min-h-11 items-center text-lg font-bold tracking-tight"
        >
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
        {/* In this order: undo / redo + save status, theme, share, profile, export (the last three
            slots belong to a project: the page fills them). Export is the last button, at the very
            right edge of the screen. */}
        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          <EditorToolbarSlot
            name="history"
            className="flex items-center gap-1 empty:hidden sm:gap-2"
          />
          <ThemeToggle />
          <EditorToolbarSlot name="share" className="flex items-center empty:hidden" />
          <UserNav />
          <EditorToolbarSlot name="export" className="flex items-center empty:hidden" />
        </div>
      </div>
    </header>
  );
}
