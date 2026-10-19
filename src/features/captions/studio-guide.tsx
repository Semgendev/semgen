"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

// A first-visit guide in three steps, shown once above the styles. It is a convenience: if the
// browser forbids storage it simply shows again next time.
const STORAGE_KEY = "semgen-studio-guide-seen";
const CHANGE_EVENT = "semgen-studio-guide";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function seen(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function StudioGuide() {
  const t = useTranslations("captions.guide");
  // the server cannot know: it renders nothing, the guide appears after the page is ready
  const alreadySeen = useSyncExternalStore(subscribe, seen, () => true);
  const [closed, setClosed] = useState(false);
  if (alreadySeen || closed) return null;

  function close() {
    setClosed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // storage unavailable: the guide only stays hidden until the page is reloaded
    }
  }

  return (
    <section
      aria-labelledby="studio-guide-title"
      className="border-border bg-brand/5 relative shrink-0 border-b px-3 py-2.5"
    >
      <h2 id="studio-guide-title" className="text-text pe-8 text-sm font-semibold">
        {t("title")}
      </h2>
      <ol className="text-text-2 mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {(["step1", "step2", "step3"] as const).map((step, index) => (
          <li key={step} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="bg-brand text-on-brand flex size-4 items-center justify-center rounded-full text-[10px] font-bold"
            >
              {index + 1}
            </span>
            {t(step)}
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={close}
        aria-label={t("close")}
        title={t("close")}
        className="text-text-2 hover:text-text focus-visible:ring-focus absolute end-1.5 top-1.5 flex size-8 items-center justify-center rounded-full outline-none focus-visible:ring-2"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </section>
  );
}
