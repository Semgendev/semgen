"use client";

import { CheckCircle2, Download, Loader2, Lock, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { PopoverTitle } from "@/components/ui/popover";
import type { PlanId } from "@/features/billing/plans";
import { planAllows } from "@/features/billing/plans";
import { cn } from "@/lib/utils";

import { getExportDownloadUrl, startExport } from "./actions";
import {
  EXPORT_FITS,
  EXPORT_FORMATS,
  EXPORT_FPS_CHOICES,
  EXPORT_QUALITIES,
  estimateSizeMb,
  exportSize,
  fitMatters,
  qualityState,
  type ExportFormat,
  type ExportFps,
  type ExportOptions,
} from "./options";
import type { RenderJob } from "./queries";

const FORMAT_KEYS = {
  original: "formatOriginal",
  "9:16": "format916",
  "1:1": "format11",
  "16:9": "format169",
} as const;

const QUALITY_KEYS = { "720p": "q720", "1080p": "q1080", "4k": "q4k" } as const;

type Notice = "business" | "no_4k_source" | null;

// The outline of a frame of the given shape, fitted in a 22 px square.
function Shape({ width, height }: { width: number; height: number }) {
  const ratio = width / height;
  const box = 22;
  const size =
    ratio >= 1 ? { width: box, height: box / ratio } : { width: box * ratio, height: box };
  return (
    <span className="flex size-6 items-center justify-center" aria-hidden="true">
      <span
        className="rounded-[3px] border-[1.5px] border-current"
        style={{ width: Math.round(size.width), height: Math.round(size.height) }}
      />
    </span>
  );
}

type Segment<T> = {
  id: T;
  label: ReactNode;
  // the option exists but belongs to another plan (shown with a lock) or cannot apply to this video
  state?: "ok" | "locked" | "unavailable";
  title?: string;
  // read by screen readers after the label (e.g. the plan a locked choice needs)
  srHint?: string;
};

// A row of choices in one pill, the chosen one raised. Locked choices stay clickable: they explain
// what they need instead of doing nothing.
function Segmented<T extends string | number>({
  label,
  value,
  items,
  onPick,
  describedBy,
}: {
  label: string;
  value: T;
  items: Segment<T>[];
  onPick: (item: Segment<T>) => void;
  describedBy?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <span className="text-text-2 text-xs font-medium">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        aria-describedby={describedBy}
        className="bg-surface-2 flex rounded-lg p-0.5"
      >
        {items.map((item) => {
          const selected = item.id === value;
          const usable = (item.state ?? "ok") === "ok";
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              title={item.title}
              onClick={() => onPick(item)}
              className={cn(
                "focus-visible:ring-focus flex min-h-8 items-center justify-center gap-1 rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 max-lg:min-h-11",
                selected
                  ? "bg-surface text-text shadow-sm"
                  : usable
                    ? "text-text-2 hover:text-text"
                    : "text-text-3 hover:text-text-2",
              )}
            >
              {item.label}
              {item.state === "locked" ? <Lock className="size-3" aria-hidden="true" /> : null}
              {item.srHint ? <span className="sr-only">{item.srHint}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ExportPanel({
  projectId,
  source,
  durationSeconds,
  plan,
  job,
  onJob,
}: {
  projectId: string;
  source: { width: number; height: number };
  durationSeconds: number;
  plan: PlanId;
  job: RenderJob | null;
  onJob: (job: RenderJob | null) => void;
}) {
  const t = useTranslations("export");
  const noticeId = useId();
  const [options, setOptions] = useState<ExportOptions>({
    format: "original",
    fit: "blur",
    quality: "1080p",
  });
  const [fps, setFps] = useState<ExportFps>(30);
  const [notice, setNotice] = useState<Notice>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  // "make another export" shows the form again over a finished job
  const [again, setAgain] = useState(false);
  const [busy, startTransition] = useTransition();

  const active = job?.status === "queued" || job?.status === "running";
  const showDone = !active && !again && job?.status === "succeeded";
  const showFailed = !active && !again && (job?.status === "failed" || job?.status === "cancelled");

  const size = exportSize(options, source);
  const sizeMb = estimateSizeMb(size, durationSeconds, fps);
  const needsFit = fitMatters(options.format, source);

  function start() {
    setError(null);
    startTransition(async () => {
      const result = await startExport(projectId, options);
      if (result.ok) {
        setAgain(false);
        setExpired(false);
        onJob({
          id: result.jobId,
          status: "queued",
          progress: 0,
          error_code: null,
          options: { quality: options.quality },
        });
      } else {
        setError(result.code);
      }
    });
  }

  function download() {
    if (!job) return;
    setError(null);
    startTransition(async () => {
      const result = await getExportDownloadUrl(job.id);
      if (result.ok) {
        // a plain navigation: the link answers with the file as an attachment
        window.location.assign(result.url);
      } else if (result.code === "expired") {
        setExpired(true);
      } else {
        setError("download");
      }
    });
  }

  const header = (
    <div className="border-border flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b px-4 py-3">
      <PopoverTitle className="whitespace-nowrap">{t("title")}</PopoverTitle>
      {!active && !showDone ? (
        <span className="bg-surface-2 text-text-2 rounded-md px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap tabular-nums">
          {t("spec", { width: size.width, height: size.height, fps })}
        </span>
      ) : null}
    </div>
  );

  if (active) {
    const percent = Math.min(100, Math.max(0, job?.progress ?? 0));
    return (
      <>
        {header}
        <div className="flex flex-col gap-3 p-4" aria-live="polite">
          <p className="text-sm font-medium tabular-nums">
            {job?.status === "queued" ? t("queued") : t("rendering", { percent })}
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="bg-surface-2 h-1.5 overflow-hidden rounded-full"
          >
            <div
              className="bg-brand h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.max(percent, 4)}%` }}
            />
          </div>
          <p className="text-text-3 text-xs">{t("youCanWait")}</p>
        </div>
      </>
    );
  }

  if (showDone) {
    return (
      <>
        {header}
        <div className="flex flex-col gap-3 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="text-success size-5" aria-hidden="true" />
            {t("ready")}
          </p>
          {expired ? (
            <p role="alert" className="text-danger text-sm">
              {t("expired")}
            </p>
          ) : (
            <>
              <Button onClick={download} disabled={busy} className="h-10 w-full max-lg:min-h-11">
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="size-4" aria-hidden="true" />
                )}
                {t("download")}
              </Button>
              <p className="text-text-3 text-xs">{t("downloadHint")}</p>
            </>
          )}
          {error ? (
            <p role="alert" className="text-danger text-sm">
              {t(`errors.${error}`)}
            </p>
          ) : null}
          <Button
            variant="ghost"
            onClick={() => setAgain(true)}
            className="text-text-2 h-9 w-full max-lg:min-h-11"
          >
            {t("another")}
          </Button>
        </div>
      </>
    );
  }

  const formatShape = (format: ExportFormat) =>
    format === "original"
      ? source
      : { width: Number(format.split(":")[0]), height: Number(format.split(":")[1]) };

  return (
    <>
      {header}
      <div className="flex flex-col gap-4 p-4">
        {showFailed ? (
          <p role="alert" className="text-danger flex items-start gap-2 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {job?.error_code === "insufficient_credits"
              ? t("errors.insufficient")
              : job?.options?.quality === "4k"
                ? t("failed")
                : t("failedFree")}
          </p>
        ) : null}

        <div role="radiogroup" aria-label={t("format")} className="flex flex-col gap-2">
          <span className="text-text-2 text-xs font-medium">{t("format")}</span>
          <div className="grid grid-cols-4 gap-1">
            {EXPORT_FORMATS.map((id) => {
              const selected = id === options.format;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={t(FORMAT_KEYS[id])}
                  onClick={() => setOptions((o) => ({ ...o, format: id }))}
                  className={cn(
                    "focus-visible:ring-focus flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border text-[11px] font-medium transition-colors outline-none focus-visible:ring-2",
                    selected
                      ? "border-brand bg-surface-2 text-text"
                      : "border-border text-text-2 hover:border-border-strong hover:text-text",
                  )}
                >
                  <Shape {...formatShape(id)} />
                  <span className="max-w-full truncate px-0.5">
                    {id === "original" ? t("formatOriginal") : id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {needsFit ? (
          <Segmented
            label={t("fit")}
            value={options.fit}
            onPick={(item) => setOptions((o) => ({ ...o, fit: item.id }))}
            items={EXPORT_FITS.map((id) => ({
              id,
              label: t(id === "crop" ? "fitCrop" : "fitBlur"),
              title: t(id === "crop" ? "fitCropHint" : "fitBlurHint"),
            }))}
          />
        ) : null}

        <Segmented
          label={t("quality")}
          value={options.quality}
          describedBy={notice ? noticeId : undefined}
          onPick={(item) => {
            const state = qualityState(item.id, source, plan);
            if (state === "ok") {
              setNotice(null);
              setOptions((o) => ({ ...o, quality: item.id }));
            } else {
              setNotice(state === "locked" ? "business" : "no_4k_source");
            }
          }}
          items={EXPORT_QUALITIES.map((id) => {
            const state = qualityState(id, source, plan);
            return {
              id,
              label: t(QUALITY_KEYS[id]),
              state: state === "ok" ? "ok" : state === "locked" ? "locked" : "unavailable",
              srHint:
                state === "locked"
                  ? t("planBusiness")
                  : state === "no_4k_source"
                    ? t("fourKUnavailable")
                    : undefined,
            };
          })}
        />

        <Segmented
          label={t("fps")}
          value={fps}
          describedBy={notice ? noticeId : undefined}
          onPick={(item) => {
            if (item.id === 60 && !planAllows(plan, "60fps")) {
              setNotice("business");
            } else {
              setNotice(null);
              setFps(item.id);
            }
          }}
          items={EXPORT_FPS_CHOICES.map((id) => ({
            id,
            label: String(id),
            state: id === 60 && !planAllows(plan, "60fps") ? "locked" : "ok",
            srHint: id === 60 && !planAllows(plan, "60fps") ? t("planBusiness") : undefined,
          }))}
        />

        {notice === "business" ? (
          <div id={noticeId} className="bg-surface-2 flex flex-col gap-1 rounded-lg p-3">
            <p className="flex items-center gap-2 text-xs font-semibold">
              <span className="bg-spark text-on-spark rounded px-1.5 py-0.5 text-[10px] tracking-wide uppercase">
                {t("planBusiness")}
              </span>
              {t("lockedTitle")}
            </p>
            <p className="text-text-2 text-xs">{t("lockedText")}</p>
          </div>
        ) : notice === "no_4k_source" ? (
          <p id={noticeId} className="text-text-3 text-xs">
            {t("fourKUnavailable")}
          </p>
        ) : null}
      </div>

      <div className="border-border flex flex-col gap-3 border-t p-4">
        <p className="text-text-3 flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-xs">
          <span className="whitespace-nowrap tabular-nums">{t("fileInfo", { size: sizeMb })}</span>
          <span className="whitespace-nowrap">{t("costFree")}</span>
        </p>
        {error ? (
          <p role="alert" className="text-danger text-sm">
            {t(`errors.${error}`)}
          </p>
        ) : null}
        <Button onClick={start} disabled={busy} className="h-10 w-full max-lg:min-h-11">
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          {showFailed ? t("retry") : t("start")}
        </Button>
      </div>
    </>
  );
}
