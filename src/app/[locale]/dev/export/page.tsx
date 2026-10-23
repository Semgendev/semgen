import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { ExportLab } from "@/features/export/dev/export-lab";

// Internal lab for the export dialog (not translated on purpose, like /dev/animations).
// Hidden in production unless SEMGEN_DEV_PAGES=1.
export default async function DevExportPage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.SEMGEN_DEV_PAGES !== "1") notFound();
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-8">
      <h1 className="text-2xl font-bold">Export dialog lab — /dev/export</h1>
      <p className="text-text-2 text-sm">
        ?job=queued|running|done|failed|insufficient · ?q=720p|1080p|4k · ?src=hd|uhd ·
        ?plan=free|business
      </p>
      <Suspense fallback={null}>
        <ExportLab />
      </Suspense>
    </main>
  );
}
