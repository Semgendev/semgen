import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { AnimationLab } from "@/features/captions/dev/animation-lab";

// Internal animation lab (not translated on purpose, like /dev/themes).
// Hidden in production unless SEMGEN_DEV_PAGES=1.
export default async function DevAnimationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.SEMGEN_DEV_PAGES !== "1") notFound();
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold">Labo des animations — /dev/animations</h1>
        <p className="text-text-2 text-sm">
          Les 5 prototypes du nouveau moteur. Ralenti, image par image et réglages en direct.
        </p>
      </div>
      {/* the player reads the clock: render it on each visit, not at build time */}
      <Suspense fallback={null}>
        <AnimationLab />
      </Suspense>
    </main>
  );
}
