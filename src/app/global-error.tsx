"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Rendered outside the intl provider, so the message is bilingual by design.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center p-6 text-center">
        <p>Something went wrong. / Une erreur est survenue.</p>
      </body>
    </html>
  );
}
