"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

// One group of settings that unfolds (accordion): a header with the title, a short summary of the
// current choice and a chevron; below it a one-line help and the choices.
export function AccordionSection({
  title,
  summary,
  help,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  help?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `${id}-panel`;

  return (
    <section
      className={cn(
        "border-border bg-surface rounded-2xl border transition-shadow",
        open && "shadow-sm",
      )}
    >
      <h3>
        <button
          type="button"
          id={`${id}-button`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="focus-visible:ring-focus flex min-h-12 w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-start outline-none focus-visible:ring-2"
        >
          <span className="text-sm font-semibold">{title}</span>
          {summary ? (
            <span className="text-text-3 ms-auto min-w-0 truncate text-xs">{summary}</span>
          ) : (
            <span className="ms-auto" />
          )}
          <ChevronDown
            className={cn(
              "text-text-2 size-4 shrink-0 transition-transform duration-300 motion-reduce:transition-none",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={`${id}-button`}
        inert={!open}
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3 px-3.5 pt-0.5 pb-3.5">
            {help ? <p className="text-text-3 text-xs leading-snug">{help}</p> : null}
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
