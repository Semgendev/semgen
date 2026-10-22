"use client";

import { CheckCircle2, Download, Loader2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { getExportDownloadUrl, startExport } from "./actions";
import {
  EXPORT_FITS,
  EXPORT_FORMATS,
  EXPORT_QUALITIES,
  canExport4k,
  exportCost,
  exportSize,
  fitMatters,
  qualityState,
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

function Choices<T extends string>({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: T;
  onChange: (next: T) => void;
  items: { id: T; label: string; hint?: string; disabled?: boolean }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      <p className="text-text-2 text-xs font-medium">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const selected = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={item.disabled}
              onClick={() => onChange(item.id)}
              className={cn(
                "focus-visible:ring-focus flex min-h-11 flex-col items-start justify-center rounded-lg border px-3 py-2 text-start text-sm transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
                selected
                  ? "border-brand bg-surface-2 text-text"
                  : "border-border text-text-2 hover:text-text hover:border-border-strong",
              )}
            >
              <span className="font-medium">{item.label}</span>
              {item.hint ? <span className="text-text-3 text-xs">{item.hint}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ExportDialog({
  open,
  onOpenChange,
  projectId,
  source,
  durationSeconds,
  balance,
  job,
  onJob,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  source: { width: number; height: number };
  durationSeconds: number;
  balance: number;
  job: RenderJob | null;
  onJob: (job: RenderJob | null) => void;
}) {
  const t = useTranslations("export");
  const [options, setOptions] = useState<ExportOptions>({
    format: "original",
    fit: "blur",
    quality: "1080p",
  });
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  // "make another export" shows the form again over a finished job
  const [again, setAgain] = useState(false);
  const [busy, startTransition] = useTransition();

  const active = job?.status === "queued" || job?.status === "running";
  const showDone = !active && !again && job?.status === "succeeded";
  const showFailed = !active && !again && (job?.status === "failed" || job?.status === "cancelled");

  const quality = qualityState(options.quality, source, durationSeconds, balance);
  const size = exportSize(options, source);
  const cost = exportCost(options.quality, durationSeconds);
  const needsFit = fitMatters(options.format, source);

  function start() {
    setError(null);
    startTransition(async () => {
      const result = await startExport(projectId, options);
      if (result.ok) {
        setAgain(false);
        setExpired(false);
        onJob({ id: result.jobId, status: "queued", progress: 0, error_code: null });
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

  let body: ReactNode;
  if (active) {
    const percent = Math.min(100, Math.max(0, job?.progress ?? 0));
    body = (
      <div className="flex flex-col gap-3" aria-live="polite">
        <p className="text-sm font-medium">
          {job?.status === "queued" ? t("queued") : t("rendering", { percent })}
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="bg-surface-2 h-2 overflow-hidden rounded-full"
        >
          <div
            className="bg-brand h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.max(percent, 4)}%` }}
          />
        </div>
        <p className="text-text-3 text-xs">{t("youCanWait")}</p>
      </div>
    );
  } else if (showDone) {
    body = (
      <div className="flex flex-col items-start gap-3">
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
            <Button onClick={download} disabled={busy} className="max-lg:min-h-11">
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
        <Button variant="outline" onClick={() => setAgain(true)} className="max-lg:min-h-11">
          {t("another")}
        </Button>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-4">
        {showFailed ? (
          <p role="alert" className="text-danger flex items-start gap-2 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {job?.error_code === "insufficient_credits" ? t("errors.insufficient") : t("failed")}
          </p>
        ) : null}
        <Choices
          label={t("format")}
          value={options.format}
          onChange={(format) => setOptions((o) => ({ ...o, format }))}
          items={EXPORT_FORMATS.map((id) => ({ id, label: t(FORMAT_KEYS[id]) }))}
        />
        {needsFit ? (
          <Choices
            label={t("fit")}
            value={options.fit}
            onChange={(fit) => setOptions((o) => ({ ...o, fit }))}
            items={EXPORT_FITS.map((id) => ({
              id,
              label: t(id === "crop" ? "fitCrop" : "fitBlur"),
              hint: t(id === "crop" ? "fitCropHint" : "fitBlurHint"),
            }))}
          />
        ) : null}
        <Choices
          label={t("quality")}
          value={options.quality}
          onChange={(next) => setOptions((o) => ({ ...o, quality: next }))}
          items={EXPORT_QUALITIES.map((id) => ({
            id,
            label: t(QUALITY_KEYS[id]),
            hint:
              id === "4k"
                ? t("fourKExtra", { count: exportCost("4k", durationSeconds) })
                : id === "1080p"
                  ? t("recommended")
                  : undefined,
            disabled: qualityState(id, source, durationSeconds, balance) === "no_4k_source",
          }))}
        />
        {!canExport4k(source) ? (
          <p className="text-text-3 text-xs">{t("fourKUnavailable")}</p>
        ) : null}
        {quality === "not_enough_credits" ? (
          <p role="alert" className="text-danger text-sm">
            {t("fourKNotEnough", { cost: exportCost("4k", durationSeconds), balance })}
          </p>
        ) : null}
        <p className="text-text-2 text-sm">
          {t("summary", { width: size.width, height: size.height })} ·{" "}
          {cost === 0 ? t("costFree") : t("costPaid", { count: cost })}
        </p>
        {error ? (
          <p role="alert" className="text-danger text-sm">
            {t(`errors.${error}`)}
          </p>
        ) : null}
        <Button
          onClick={start}
          disabled={busy || quality !== "ok"}
          className="h-9 w-full max-lg:min-h-11"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {showFailed ? t("retry") : t("start")}
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t("close")} className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("intro")}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
