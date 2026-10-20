import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getCreditBalance } from "@/features/credits/queries";
import { CaptionFontPreload } from "@/features/captions/font-preload";
import { CaptionStudio } from "@/features/captions/caption-studio";
import { CaptionWordsProvider } from "@/features/captions/caption-words";
import { resolveCaptionStyle } from "@/features/captions/project-style";
import { PlayerProvider } from "@/features/projects/player";
import { PreviewStatusPanel } from "@/features/projects/preview-status";
import { ProjectTitle } from "@/features/projects/project-title";
import { getProject, getVideoUrls } from "@/features/projects/service";
import { getCustomColors } from "@/features/preferences/queries";
import { getLatestTranscriptionJob, getTranscript } from "@/features/transcription/queries";
import { TranscriptionSection } from "@/features/transcription/transcription-section";
import { Link } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ProjectContent({ params }: { params: Promise<{ locale: string; id: string }> }) {
  // Per-user page: rendered on every request, never prerendered (libraries below read the clock).
  await connection();
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projects");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/${locale}/login?next=/${locale}/projects`);

  // everything is asked at once: row-level security hides what is not the user's own
  const [project, transcript, job, balance, customColors] = await Promise.all([
    getProject(supabase, id),
    getTranscript(supabase, id),
    getLatestTranscriptionJob(supabase, id),
    getCreditBalance(supabase),
    getCustomColors(supabase),
  ]);
  if (!project) notFound();
  const urls = await getVideoUrls(supabase, [project]);
  const videoUrl = urls[project.id];

  const title = <ProjectTitle projectId={project.id} title={project.title} />;
  const transcription = project.source_video_key ? (
    <TranscriptionSection
      projectId={project.id}
      title={project.title}
      durationSeconds={project.duration_s}
      balance={balance}
      initialJob={job}
      transcript={transcript}
    />
  ) : null;

  return (
    <PlayerProvider>
      <CaptionFontPreload selected={resolveCaptionStyle(project.caption_style).presetId} />
      {/* Remounts when the transcript arrives, so the captions start from its words. */}
      <CaptionWordsProvider
        key={transcript?.id ?? "none"}
        initialWords={transcript?.words ?? []}
        initialPresetId={resolveCaptionStyle(project.caption_style).presetId}
      >
        <Link
          href="/projects"
          className="text-text-2 hover:text-text inline-flex min-h-11 w-fit items-center gap-1 text-sm transition-colors lg:-my-1 lg:min-h-8"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t("backToList")}
        </Link>

        {videoUrl ? (
          <CaptionStudio
            projectId={project.id}
            src={videoUrl}
            initialPreset={resolveCaptionStyle(project.caption_style).presetId}
            initialColors={resolveCaptionStyle(project.caption_style).colors}
            initialTweaks={resolveCaptionStyle(project.caption_style).tweaks}
            initialMoves={resolveCaptionStyle(project.caption_style).moves}
            initialCustomColors={customColors}
            titleSlot={title}
            transcriptionSlot={transcription}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {title}
            {project.source_video_key && project.preview_status !== "ready" ? (
              <PreviewStatusPanel projectId={project.id} status={project.preview_status} />
            ) : (
              <p className="text-muted-foreground">{t("noVideo")}</p>
            )}
            {transcription}
          </div>
        )}
      </CaptionWordsProvider>
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
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:px-6 sm:pt-3 sm:pb-4 lg:gap-3">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ProjectContent params={params} />
      </Suspense>
    </main>
  );
}
