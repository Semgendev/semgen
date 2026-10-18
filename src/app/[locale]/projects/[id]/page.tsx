import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getCreditBalance } from "@/features/credits/queries";
import { PlayerProvider, VideoPlayer } from "@/features/projects/player";
import { PreviewStatusPanel } from "@/features/projects/preview-status";
import { ProjectActions } from "@/features/projects/project-actions";
import { ProjectStatusBadge } from "@/features/projects/project-status-badge";
import { getProject, getVideoUrls } from "@/features/projects/service";
import { getLatestTranscriptionJob, getTranscript } from "@/features/transcription/queries";
import { TranscriptionSection } from "@/features/transcription/transcription-section";
import { Link } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ProjectContent({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projects");
  const format = await getFormatter();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/${locale}/login?next=/${locale}/projects`);

  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [urls, transcript, job, balance] = await Promise.all([
    getVideoUrls(supabase, [project]),
    getTranscript(supabase, project.id),
    getLatestTranscriptionJob(supabase, project.id),
    getCreditBalance(supabase),
  ]);
  const videoUrl = urls[project.id];

  return (
    <PlayerProvider>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold break-words">{project.title}</h1>
        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
          <ProjectStatusBadge status={project.status} />
          <time dateTime={project.created_at}>
            {format.dateTime(new Date(project.created_at), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
          {project.source_size_bytes ? (
            <span>{(project.source_size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          {videoUrl ? (
            <VideoPlayer src={videoUrl} fallback={t("noVideoSupport")} />
          ) : project.source_video_key && project.preview_status !== "ready" ? (
            <PreviewStatusPanel projectId={project.id} status={project.preview_status} />
          ) : (
            <p className="text-muted-foreground">{t("noVideo")}</p>
          )}

          <ProjectActions projectId={project.id} title={project.title} />
        </div>

        {project.source_video_key ? (
          <TranscriptionSection
            projectId={project.id}
            title={project.title}
            durationSeconds={project.duration_s}
            balance={balance}
            initialJob={job}
            transcript={transcript}
          />
        ) : null}
      </div>

      <Link href="/projects" className="text-primary text-sm underline-offset-4 hover:underline">
        {t("backToList")}
      </Link>
    </PlayerProvider>
  );
}

// The dynamic id must be read inside <Suspense>, otherwise the page cannot be prerendered.
export default function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ProjectContent params={params} />
      </Suspense>
    </main>
  );
}
