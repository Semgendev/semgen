"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";

import { requestPreview } from "./actions";
import type { PreviewStatus } from "./service";

const REFRESH_MS = 4000;

// Shown in place of the video while its browser-safe preview is being prepared.
// A "pending" project (old upload, or the queue was down) is started once on mount;
// the page then refreshes itself until the preview is ready.
export function PreviewStatusPanel({
  projectId,
  status,
}: {
  projectId: string;
  status: Exclude<PreviewStatus, "ready">;
}) {
  const t = useTranslations("projects");
  const router = useRouter();
  const [retrying, startTransition] = useTransition();
  const [requestFailed, setRequestFailed] = useState(false);
  const started = useRef(false);

  function start() {
    setRequestFailed(false);
    startTransition(async () => {
      const result = await requestPreview(projectId);
      if (result.ok) router.refresh();
      else setRequestFailed(true);
    });
  }

  useEffect(() => {
    if (status === "pending" && !started.current) {
      started.current = true;
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start only once per mount
  }, [status]);

  useEffect(() => {
    if (status === "failed" || requestFailed) return;
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [status, requestFailed, router]);

  const failed = status === "failed" || requestFailed;

  return (
    <div
      role="status"
      className="bg-muted text-muted-foreground flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-xl p-6 text-center"
    >
      {failed ? (
        <>
          <p>{t("previewFailed")}</p>
          <Button onClick={start} disabled={retrying} variant="outline">
            {t("previewRetry")}
          </Button>
        </>
      ) : (
        <>
          <Loader2 className="size-8 animate-spin" aria-hidden="true" />
          <p>{t("previewPreparing")}</p>
        </>
      )}
    </div>
  );
}
