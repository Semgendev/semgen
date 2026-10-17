"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: host,
      capture_pageview: "history_change",
      person_profiles: "identified_only",
    });
  }, []);

  return children;
}
