import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectStatusBadge } from "@/features/projects/project-status-badge";
import { getVideoUrls, listProjects } from "@/features/projects/service";
import { Link } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ProjectsContent({ locale }: { locale: string }) {
  const t = await getTranslations("projects");
  const format = await getFormatter();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/${locale}/login?next=/${locale}/projects`);

  const projects = await listProjects(supabase);
  const urls = await getVideoUrls(supabase, projects);

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-muted-foreground">{t("emptyList")}</p>
          <Link href="/projects/new" className={buttonVariants()}>
            {t("newProject")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/projects/${project.id}`}
            className="bg-card hover:border-primary flex h-full flex-col overflow-hidden rounded-xl border transition-colors"
          >
            <div className="bg-muted aspect-video w-full">
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
            <div className="flex flex-col gap-2 p-4">
              <span className="truncate font-medium">{project.title}</span>
              <div className="flex items-center justify-between gap-2">
                <ProjectStatusBadge status={project.status} />
                <time dateTime={project.created_at} className="text-muted-foreground text-xs">
                  {format.dateTime(new Date(project.created_at), { dateStyle: "medium" })}
                </time>
              </div>
            </div>
          </Link>
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
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("listTitle")}</h1>
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
