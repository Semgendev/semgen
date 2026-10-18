import { getTranslations } from "next-intl/server";

import type { ProjectStatus } from "./service";

const STYLES: Record<ProjectStatus, string> = {
  uploading: "bg-muted text-muted-foreground",
  uploaded: "bg-accent text-accent-foreground",
  processing: "bg-secondary text-secondary-foreground",
  ready: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  failed: "bg-destructive/10 text-destructive",
};

export async function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const t = await getTranslations("projects.status");
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {t(status)}
    </span>
  );
}
