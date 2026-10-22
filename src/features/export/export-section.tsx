"use client";

import { Download, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { RENDER_JOB_COLUMNS, renderJobSchema, type RenderJob } from "./queries";

// The dialog is only fetched when it is opened: the project page stays light.
const ExportDialog = dynamic(() => import("./export-dialog").then((m) => m.ExportDialog), {
  ssr: false,
});

const POLL_MS = 1500;

export function ExportSection({
  projectId,
  source,
  durationSeconds,
  balance,
  hasText,
  initialJob,
}: {
  projectId: string;
  // null when the video was never measured (the preview/transcription measures it)
  source: { width: number; height: number } | null;
  durationSeconds: number | null;
  balance: number;
  hasText: boolean;
  initialJob: RenderJob | null;
}) {
  const t = useTranslations("export");
  const router = useRouter();
  const [job, setJob] = useState<RenderJob | null>(initialJob);
  const [open, setOpen] = useState(false);
  // once opened, the dialog stays mounted so its close animation and choices survive
  const [mounted, setMounted] = useState(false);

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

  const done = job?.status === "succeeded";
  const percent = Math.min(100, Math.max(0, job?.progress ?? 0));

  return (
    <>
      <Button
        size="sm"
        disabled={!hasText}
        title={hasText ? undefined : t("needsText")}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        className="max-lg:min-h-11"
      >
        {active ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        {active ? t("buttonBusy", { percent }) : done ? t("buttonDone") : t("button")}
      </Button>
      {mounted ? (
        <ExportDialog
          open={open}
          onOpenChange={setOpen}
          projectId={projectId}
          source={source}
          durationSeconds={durationSeconds}
          balance={balance}
          job={job}
          onJob={setJob}
        />
      ) : null}
    </>
  );
}
