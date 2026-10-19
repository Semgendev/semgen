"use client";

import { MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type TabId = "styles" | "transcription";

// The tabs never grow wider than the panel: past this number the others go in a "⋯" menu.
const MAX_VISIBLE = 3;

export function StudioTabs({
  tabs,
  value,
  onChange,
  moreLabel,
}: {
  tabs: { id: TabId; label: string }[];
  value: TabId;
  onChange: (id: TabId) => void;
  moreLabel: string;
}) {
  // the active tab is always one of the visible ones
  const activeIndex = tabs.findIndex((tab) => tab.id === value);
  const visible = tabs.slice(0, MAX_VISIBLE);
  if (activeIndex >= MAX_VISIBLE && tabs[activeIndex]) visible[MAX_VISIBLE - 1] = tabs[activeIndex];
  const hidden = tabs.filter((tab) => !visible.includes(tab));

  return (
    <div className="border-border flex shrink-0 items-center gap-1 border-b px-2 pt-2">
      <div role="tablist" className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
        {visible.map((tab) => {
          const selected = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.id)}
              className={cn(
                "focus-visible:ring-focus relative truncate rounded-t-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2",
                selected ? "text-text" : "text-text-2 hover:text-text",
              )}
            >
              {tab.label}
              <span
                aria-hidden="true"
                className={cn(
                  "bg-brand absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-opacity",
                  selected ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>
      {hidden.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label={moreLabel}
                title={moreLabel}
                className="text-text-2 hover:text-text focus-visible:ring-focus mb-1 flex size-8 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2"
              />
            }
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hidden.map((tab) => (
              <DropdownMenuItem key={tab.id} onClick={() => onChange(tab.id)}>
                {tab.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
