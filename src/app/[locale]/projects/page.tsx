import { Film } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectMenu } from "@/features/projects/project-actions";
import { shortTitle } from "@/features/projects/short-title";
import { ProjectStatusBadge } from "@/features/projects/project-status-badge";
import { getVideoUrls, listProjects } from "@/features/projects/service";
import { Link } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ProjectsContent({ locale }: { locale: string }) {
  const t = await getTranslations("projects");
  const format = await getFormatter();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/${locale}/login?next=/${locale}/projects`);

  const projects = await listProjects(supabase);
  const urls = await getVideoUrls(supabase, projects);

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <Film className="text-text-3 size-10" aria-hidden />
          <p className="text-text-2 max-w-sm">{t("emptyList")}</p>
          <Link href="/projects/new" className={buttonVariants()}>
            {t("newProject")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {projects.map((project) => (
        <li
          key={project.id}
          className="bg-surface border-border hover:border-brand-border relative flex flex-col overflow-hidden rounded-xl border transition-colors"
        >
          <Link
            href={`/projects/${project.id}`}
            className="focus-visible:ring-ring relative block aspect-square focus-visible:ring-2 focus-visible:outline-none"
          >
            <div className="bg-surface-2 absolute inset-0">
              {urls[project.id] ? (
                <video
                  src={`${urls[project.id]}#t=0.1`}
                  preload="metadata"
                  muted
                  playsInline
                  aria-hidden
                  className="size-full object-cover"
                />
              ) : null}
            </div>
            <div className="from-background/95 via-background/70 absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t to-transparent p-2 pe-9 pt-6">
              <span className="truncate text-sm font-medium" title={project.title}>
                {shortTitle(project.title)}
              </span>
              <div className="flex items-center gap-2">
                <ProjectStatusBadge status={project.status} />
                <time dateTime={project.created_at} className="text-muted-foreground text-xs">
                  {format.dateTime(new Date(project.created_at), { dateStyle: "medium" })}
                </time>
              </div>
            </div>
          </Link>
          <ProjectMenu
            projectId={project.id}
            title={project.title}
            afterDelete="refresh"
            className="absolute end-1 bottom-1"
          />
        </li>
      ))}
    </ul>
  );
}

export default async function ProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projects");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold sm:text-3xl">{t("listTitle")}</h1>
        <Link href="/projects/new" className={buttonVariants()}>
          {t("newProject")}
        </Link>
      </header>
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <ProjectsContent locale={locale} />
      </Suspense>
    </main>
  );
}
