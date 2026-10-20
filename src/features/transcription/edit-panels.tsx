"use client";

import { CornerDownLeft, Search, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { MAX_WORD_LENGTH } from "./edit";

type InlineWordEditorProps = {
  value: string;
  onChange: (value: string) => void;
  canSplit: boolean;
  onCommit: () => void;
  onSplit: () => void;
  onDelete: () => void;
  onCancel: () => void;
};

// The word itself turns into a field of the same size (no buttons around it, so the neighbouring
// words only shift a little). Enter or tapping elsewhere saves, Escape cancels, an empty field + Enter
// deletes the word, Shift+Enter starts a new line here.
export function InlineWordEditor({
  value,
  onChange,
  canSplit,
  onCommit,
  onSplit,
  onDelete,
  onCancel,
}: InlineWordEditorProps) {
  const t = useTranslations("transcription.edit");
  const finished = useRef(false);

  function finish(action: () => void) {
    // Blur fires after Enter/Escape too: only the first outcome counts.
    if (finished.current) return;
    finished.current = true;
    action();
  }

  return (
    <input
      value={value}
      aria-label={t("wordLabel")}
      maxLength={MAX_WORD_LENGTH * 3}
      style={{ width: `${Math.max(value.length, 2) + 2}ch` }}
      autoFocus
      autoComplete="off"
      spellCheck
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => onChange(event.target.value)}
      // Leaving an emptied field never deletes by accident: only Enter does.
      onBlur={() => finish(() => (value.trim() ? onCommit() : onCancel()))}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (!value.trim()) finish(onDelete);
          else if (event.shiftKey && canSplit) finish(onSplit);
          else finish(onCommit);
        } else if (event.key === "Escape") {
          event.preventDefault();
          finish(onCancel);
        }
      }}
      className="border-brand bg-surface text-text focus-visible:ring-ring box-content max-w-full rounded border px-1 py-0 align-baseline outline-none focus-visible:ring-2"
    />
  );
}

type WordActionsProps = {
  canSplit: boolean;
  onDelete: () => void;
  onSplit: () => void;
  // true for the word being edited: the click must not take the focus away from its field
  keepFocus?: boolean;
  className?: string;
};

// Icon buttons floating just above a word (delete, new line). Icons only: more can be added later.
export function WordActions({
  canSplit,
  onDelete,
  onSplit,
  keepFocus = false,
  className,
}: WordActionsProps) {
  const t = useTranslations("transcription.edit");
  const keep = keepFocus
    ? (event: { preventDefault: () => void }) => event.preventDefault()
    : undefined;
  const button =
    "text-text-2 hover:bg-surface-2 inline-flex size-7 items-center justify-center rounded-md transition-colors";

  return (
    // The padding under the pill bridges the gap to the word: it stays open while the mouse goes up to it.
    <span className={cn("absolute start-0 bottom-full z-10 pb-2", className)}>
      <span className="bg-surface border-border flex gap-0.5 rounded-lg border p-0.5 shadow-sm">
        <button
          type="button"
          title={t("deleteWord")}
          aria-label={t("deleteWord")}
          onMouseDown={keep}
          onClick={onDelete}
          className={cn(button, "hover:text-danger")}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
        {canSplit ? (
          <button
            type="button"
            title={t("newLine")}
            aria-label={t("newLine")}
            onMouseDown={keep}
            onClick={onSplit}
            className={cn(button, "hover:text-text")}
          >
            <CornerDownLeft className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </span>
    </span>
  );
}

type SearchToolProps = {
  find: string;
  onFind: (value: string) => void;
  matchCount: number;
  onNext: () => void;
};

// Search only finds a word and jumps to it. It is an icon: the field opens in front of the lines
// (nothing around it moves) and closes with Escape or a tap elsewhere. Replacing is a separate tool.
export function SearchTool({ find, onFind, matchCount, onNext }: SearchToolProps) {
  const t = useTranslations("transcription.edit");
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function away(event: PointerEvent) {
      if (event.target instanceof Node && !wrap.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  return (
    <div
      ref={wrap}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <Button
        ref={button}
        type="button"
        variant="ghost"
        size="icon"
        className={cn("size-11", (open || find) && "bg-surface-2 text-brand")}
        aria-expanded={open}
        aria-label={t("searchLabel")}
        title={t("searchLabel")}
        onClick={() => setOpen((value) => !value)}
      >
        <Search aria-hidden="true" />
      </Button>
      {open ? (
        <div
          role="search"
          className="bg-surface border-border absolute end-0 top-full z-30 mt-1 w-[min(18rem,calc(100vw-2rem))] rounded-xl border p-2 shadow-lg"
        >
          <div className="relative">
            <Search
              className="text-text-3 pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              autoFocus
              value={find}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchLabel")}
              autoComplete="off"
              className="min-h-10 ps-9 pe-20"
              onChange={(event) => onFind(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onNext();
                }
              }}
            />
            {find ? (
              <span
                className="text-text-2 absolute end-9 top-1/2 -translate-y-1/2 text-xs"
                aria-live="polite"
              >
                {t("matches", { count: matchCount })}
              </span>
            ) : null}
            {find ? (
              <button
                type="button"
                aria-label={t("clearSearch")}
                onClick={() => onFind("")}
                className="text-text-2 hover:text-text absolute end-2 top-1/2 -translate-y-1/2 rounded p-1"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
