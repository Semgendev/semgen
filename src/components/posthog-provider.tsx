"use client";

import { useEffect } from "react";

import { whenIdle } from "@/lib/when-idle";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

// PostHog (about 100 KB) is fetched only after the page is ready and idle, not with the first scripts.
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!key) return;
    whenIdle(() => {
      void import("posthog-js").then(({ default: posthog }) => {
        if (posthog.__loaded) return;
        posthog.init(key, {
          api_host: host,
          capture_pageview: "history_change",
          person_profiles: "identified_only",
        });
      });
    });
  }, []);

  return children;
}
