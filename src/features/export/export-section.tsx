"use client";

import { Download, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PlanId } from "@/features/billing/plans";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { RENDER_JOB_COLUMNS, renderJobSchema, type RenderJob } from "./queries";

// The panel is only fetched when needed (fetched early on hover): the project page stays light.
const loadPanel = () => import("./export-panel").then((m) => m.ExportPanel);
const ExportPanel = dynamic(loadPanel, { ssr: false });

const POLL_MS = 1500;

// The "Export" button, top right of the project page, and its settings panel anchored under it.
export function ExportSection({
  projectId,
  source,
  durationSeconds,
  plan,
  hasText,
  initialJob,
}: {
  projectId: string;
  // null when the video was never measured (the preview/transcription measures it)
  source: { width: number; height: number } | null;
  durationSeconds: number | null;
  plan: PlanId;
  hasText: boolean;
  initialJob: RenderJob | null;
}) {
  const t = useTranslations("export");
  const router = useRouter();
  const [job, setJob] = useState<RenderJob | null>(initialJob);
  const [open, setOpen] = useState(false);

  const active = job?.status === "queued" || job?.status === "running";
  const jobId = job?.id;

  // Live progress: read the job (allowed by RLS for its owner) until it reaches a final state.
  useEffect(() => {
    if (!active || !jobId) return;
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    const timer = setInterval(async () => {
      const { data } = await supabase
        .from("jobs")
        .select(RENDER_JOB_COLUMNS)
        .eq("id", jobId)
        .single();
      const parsed = renderJobSchema.safeParse(data);
      if (cancelled || !parsed.success) return;
      setJob(parsed.data);
      // a final state may have refunded credits: refresh the balance
      if (parsed.data.status !== "queued" && parsed.data.status !== "running") router.refresh();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active, jobId, router]);

  if (!source || !durationSeconds) return null;

  const percent = Math.min(100, Math.max(0, job?.progress ?? 0));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={!hasText}
        title={hasText ? undefined : t("needsText")}
        onPointerEnter={() => void loadPanel()}
        onFocus={() => void loadPanel()}
        render={<Button size="sm" className="max-lg:min-h-11" />}
      >
        {active ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        {active ? `${percent}%` : t("button")}
      </PopoverTrigger>
      <PopoverContent className="w-[min(16.25rem,calc(100vw-2rem))]">
        <ExportPanel
          projectId={projectId}
          source={source}
          durationSeconds={durationSeconds}
          plan={plan}
          job={job}
          onJob={setJob}
        />
      </PopoverContent>
    </Popover>
  );
}
