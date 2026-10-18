import { AlertTriangle, CheckCircle2, CloudUpload, Loader2, Video } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";

import type { ProjectStatus } from "./service";

// A state is never shown by colour alone: each one has its own icon and label.
const STYLES: Record<ProjectStatus, { className: string; Icon: typeof Video; spin?: boolean }> = {
  uploading: { className: "bg-surface-2 text-text-2", Icon: CloudUpload },
  uploaded: { className: "bg-surface-2 text-text-2", Icon: Video },
  processing: { className: "bg-brand/12 text-brand-text", Icon: Loader2, spin: true },
  ready: { className: "bg-success/12 text-success", Icon: CheckCircle2 },
  failed: { className: "bg-danger/12 text-danger", Icon: AlertTriangle },
};

export async function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const t = await getTranslations("projects.status");
  const { className, Icon, spin } = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      <Icon className={cn("size-3.5", spin && "animate-spin")} aria-hidden="true" />
      {t(status)}
    </span>
  );
}
