"use client";

import { Languages, Loader2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/routing";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { startTranscription } from "./actions";
import { transcriptionCost } from "./logic";
import {
  JOB_COLUMNS,
  transcriptionJobSchema,
  type Transcript,
  type TranscriptionJob,
} from "./queries";
import { TranscriptView } from "./transcript-view";
import { transcriptionStep } from "./view";

// Auto-detection first, then the languages our users ask for most (including African languages).
const LANGUAGE_CHOICES = [
  "fr",
  "en",
  "es",
  "pt",
  "ar",
  "sw",
  "ha",
  "yo",
  "de",
  "it",
  "zh",
  "hi",
] as const;

const POLL_MS = 2500;
// Job error codes (set by the worker) and start errors (from the server action) with a message.
const KNOWN_ERRORS = new Set([
  "no_audio",
  "no_speech",
  "too_long",
  "insufficient_credits",
  "video_unavailable",
  "no_video",
  "provider_failed",
  "provider_timeout",
  "queue_unavailable",
  "invalid",
  "unauthorized",
  "not_ready",
  "already_running",
]);

type Props = {
  projectId: string;
  title: string;
  durationSeconds: number | null;
  balance: number;
  initialJob: TranscriptionJob | null;
  transcript: Transcript | null;
};

export function TranscriptionSection({
  projectId,
  title,
  durationSeconds,
  balance,
  initialJob,
  transcript,
}: Props) {
  const t = useTranslations("transcription");
  const locale = useLocale();
  const router = useRouter();
  const [language, setLanguage] = useState("auto");
  const [job, setJob] = useState<TranscriptionJob | null>(initialJob);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, startTransition] = useTransition();

  const active = job?.status === "queued" || job?.status === "running";
  const jobId = job?.id;

  // Live progress: read the job (allowed by RLS for its owner) until it reaches a final state.
  useEffect(() => {
    if (!active || !jobId) return;
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    const timer = setInterval(async () => {
      const { data } = await supabase.from("jobs").select(JOB_COLUMNS).eq("id", jobId).single();
      const parsed = transcriptionJobSchema.safeParse(data);
      if (cancelled || !parsed.success) return;
      setJob(parsed.data);
      if (parsed.data.status !== "queued" && parsed.data.status !== "running") {
        // Final state: reload the transcript and the credit balance from the server.
        router.refresh();
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active, jobId, router]);

  const languageNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "language" });
    } catch {
      return null;
    }
  }, [locale]);

  const cost = durationSeconds ? transcriptionCost(durationSeconds) : null;
  const notEnoughCredits = cost !== null && balance < cost;

  function start() {
    setStartError(null);
    startTransition(async () => {
      const result = await startTranscription(projectId, language === "auto" ? null : language);
      if (result.ok) {
        setJob({ id: result.jobId, status: "queued", progress: 0, error_code: null });
        router.refresh();
      } else {
        setStartError(result.code);
      }
    });
  }

  if (transcript) {
    return (
      <section aria-labelledby="transcript-title" className="flex flex-col gap-3">
        <h2 id="transcript-title" className="text-lg font-semibold">
          {t("title")}
        </h2>
        <TranscriptView transcript={transcript} title={title} />
      </section>
    );
  }

  if (active && job) {
    const step = transcriptionStep(job.status === "queued" ? "queued" : "running", job.progress);
    return (
      <section aria-labelledby="transcript-title" className="flex flex-col gap-4">
        <h2 id="transcript-title" className="text-lg font-semibold">
          {t("title")}
        </h2>
        <div role="status" className="bg-card flex flex-col gap-3 rounded-xl border p-5">
          <p className="flex items-center gap-2 font-medium">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t(`step.${step}`)}
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={job.progress}
            className="bg-muted h-2 overflow-hidden rounded-full"
          >
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(job.progress, 4)}%` }}
            />
          </div>
          <p className="text-muted-foreground text-sm">{t("youCanWait")}</p>
        </div>
      </section>
    );
  }

  const failedCode = job?.status === "failed" ? (job.error_code ?? "unknown") : null;
  const errorCode = startError ?? failedCode;
  const errorMessage = errorCode
    ? t(`errors.${KNOWN_ERRORS.has(errorCode) ? errorCode : "unknown"}`)
    : null;

  return (
    <section aria-labelledby="transcript-title" className="flex flex-col gap-4">
      <h2 id="transcript-title" className="text-lg font-semibold">
        {t("title")}
      </h2>

      <div className="bg-card flex flex-col gap-4 rounded-xl border p-5">
        <p className="text-muted-foreground text-sm">{t("intro")}</p>

        <div className="flex flex-col gap-2">
          <Label htmlFor="transcription-language" className="flex items-center gap-2">
            <Languages className="size-4" aria-hidden="true" />
            {t("languageLabel")}
          </Label>
          <select
            id="transcription-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="border-input bg-background focus-visible:ring-ring/50 h-9 rounded-lg border px-3 text-sm outline-none focus-visible:ring-3"
          >
            <option value="auto">{t("auto")}</option>
            {LANGUAGE_CHOICES.map((code) => (
              <option key={code} value={code}>
                {languageNames?.of(code) ?? code}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm">
          {cost !== null ? t("cost", { count: cost }) : t("costUnknown")}
          <span className="text-muted-foreground"> · {t("balance", { count: balance })}</span>
        </p>

        {notEnoughCredits ? (
          <p role="alert" className="text-destructive text-sm">
            {t("notEnoughCredits", { cost: cost ?? 0, balance })}
          </p>
        ) : null}
        {errorMessage ? (
          <p role="alert" className="text-destructive text-sm">
            {errorMessage}
          </p>
        ) : null}

        <Button type="button" onClick={start} disabled={starting || notEnoughCredits}>
          {starting ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles aria-hidden="true" />
          )}
          {failedCode ? t("retry") : t("start")}
        </Button>
      </div>
    </section>
  );
}
