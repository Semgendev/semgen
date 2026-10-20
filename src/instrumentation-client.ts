import { whenIdle } from "@/lib/when-idle";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

type SentryModule = typeof import("@sentry/nextjs");
let sentry: SentryModule | undefined;

// Sentry (about 100 KB) is fetched after the page is ready and idle, so it never slows the first
// display. Errors thrown in the very first seconds are the price of a faster start.
if (dsn) {
  whenIdle(() => {
    void import("@sentry/nextjs").then((module) => {
      module.init({ dsn, enabled: true, tracesSampleRate: 0.1 });
      sentry = module;
    });
  });
}

export function onRouterTransitionStart(
  ...args: Parameters<SentryModule["captureRouterTransitionStart"]>
) {
  return sentry?.captureRouterTransitionStart(...args);
}
