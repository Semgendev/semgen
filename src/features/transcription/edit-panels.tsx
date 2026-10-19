"use client";

import { CornerDownLeft, ReplaceAll, Search, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

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

type SearchBarProps = {
  find: string;
  onFind: (value: string) => void;
  matchCount: number;

  onToggleReplace: () => void;
  onNext: () => void;
};

// Search only finds a word and jumps to it. Replacing is a separate tool (the icon on the right).
export function SearchBar({
  find,
  onFind,
  matchCount,

  onToggleReplace,
  onNext,
}: SearchBarProps) {
  const t = useTranslations("transcription.edit");

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="relative min-w-40 flex-1">
        <Search
          className="text-text-3 pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={find}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          autoComplete="off"
          className="min-h-11 ps-9 pe-24"
          onChange={(event) => onFind(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onNext();
            } else if (event.key === "Escape") {
              onFind("");
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
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 shrink-0 rounded-lg"
        aria-haspopup="dialog"
        aria-label={t("replaceToggleHint")}
        title={t("replaceToggleHint")}
        onClick={onToggleReplace}
      >
        <ReplaceAll className="size-5" aria-hidden="true" />
      </Button>
    </div>
  );
}
