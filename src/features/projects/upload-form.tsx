"use client";

import { UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/routing";

import { completeUpload, createProject } from "./actions";
import {
  defaultProjectTitle,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  validateVideoDuration,
  validateVideoFile,
  type VideoValidationError,
} from "./limits";
import { readVideoDuration, uploadVideo, type UploadHandle } from "./upload-video";

type State =
  | { step: "idle" }
  | { step: "uploading"; percent: number }
  | { step: "finishing" }
  | { step: "done" }
  | { step: "error"; code: VideoValidationError | "upload_failed" | "unauthorized" | "unknown" };

export function UploadForm() {
  const t = useTranslations("projects");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [state, setState] = useState<State>({ step: "idle" });
  const [dragging, setDragging] = useState(false);
  const handle = useRef<UploadHandle | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = state.step === "uploading" || state.step === "finishing";

  async function selectFile(candidate: File | undefined) {
    if (!candidate) return;
    const check = validateVideoFile(candidate);
    if (!check.ok) {
      setFile(null);
      setState({ step: "error", code: check.error });
      return;
    }
    const durationError = validateVideoDuration(await readVideoDuration(candidate));
    if (durationError) {
      setFile(null);
      setState({ step: "error", code: durationError });
      return;
    }
    setFile(candidate);
    setTitle(defaultProjectTitle(candidate.name));
    setState({ step: "idle" });
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!busy) void selectFile(event.dataTransfer.files[0]);
  }

  async function start() {
    if (!file) return;
    const check = validateVideoFile(file);
    if (!check.ok) return setState({ step: "error", code: check.error });

    setState({ step: "uploading", percent: 0 });
    const created = await createProject(title);
    if (!created.ok) {
      return setState({
        step: "error",
        code: created.code === "unauthorized" ? "unauthorized" : "unknown",
      });
    }

    try {
      handle.current = await uploadVideo({
        file,
        projectId: created.id,
        extension: check.extension,
        contentType: check.contentType,
        onProgress: (percent) => setState({ step: "uploading", percent }),
      });
      await handle.current.promise;
      setState({ step: "finishing" });
      const completed = await completeUpload(created.id);
      setState(completed.ok ? { step: "done" } : { step: "error", code: "unknown" });
    } catch {
      setState({ step: "error", code: "upload_failed" });
    } finally {
      handle.current = null;
    }
  }

  function cancel() {
    handle.current?.abort();
    setState({ step: "idle" });
  }

  if (state.step === "done") {
    return (
      <div role="status" className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t("done")}</h2>
        <p className="text-muted-foreground">{t("doneBody")}</p>
        <Button
          variant="outline"
          onClick={() => {
            setFile(null);
            setTitle("");
            setState({ step: "idle" });
          }}
        >
          {t("another")}
        </Button>
        <Link href="/account" className="text-primary text-sm underline-offset-4 hover:underline">
          {t("backToAccount")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-primary bg-accent" : "border-border"
        }`}
      >
        <UploadCloud className="text-muted-foreground size-10" aria-hidden />
        <p className="font-medium">{file ? file.name : t("dropHint")}</p>
        <p className="text-muted-foreground text-sm">
          {t("formats", {
            size: Math.round(MAX_VIDEO_BYTES / (1024 * 1024)),
            minutes: MAX_VIDEO_SECONDS / 60,
          })}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.mov,.webm,.mkv,video/mp4,video/quicktime,video/webm,video/x-matroska"
          className="sr-only"
          aria-label={t("chooseFile")}
          disabled={busy}
          onChange={(event) => void selectFile(event.target.files?.[0])}
        />
        <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
          {t("chooseFile")}
        </Button>
      </div>

      {file ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="project-title">{t("titleLabel")}</Label>
          <Input
            id="project-title"
            value={title}
            maxLength={120}
            disabled={busy}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
      ) : null}

      {state.step === "uploading" || state.step === "finishing" ? (
        <div className="flex flex-col gap-2">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={state.step === "uploading" ? state.percent : 100}
            className="bg-muted h-2 w-full overflow-hidden rounded-full"
          >
            <div
              className="bg-primary h-full transition-all"
              style={{ width: `${state.step === "uploading" ? state.percent : 100}%` }}
            />
          </div>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {state.step === "uploading"
              ? t("uploading", { percent: state.percent })
              : t("finishing")}
          </p>
        </div>
      ) : null}

      {state.step === "error" ? (
        <p role="alert" className="text-destructive text-sm">
          {t(`errors.${state.code}`)}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button onClick={() => void start()} disabled={!file || busy || title.trim() === ""}>
          {t("start")}
        </Button>
        {state.step === "uploading" ? (
          <Button variant="ghost" onClick={cancel}>
            {t("cancel")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
