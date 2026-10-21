"use client";

import { CornerDownLeft, Search, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

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
    // A hidden copy of the text gives the field exactly the width of the word: no empty space.
    <span className="inline-grid align-baseline">
      <span
        aria-hidden="true"
        className="invisible col-start-1 row-start-1 ps-0.5 pe-[1.5ch] whitespace-pre"
      >
        {value || " "}
      </span>
      <input
        value={value}
        aria-label={t("wordLabel")}
        maxLength={MAX_WORD_LENGTH * 3}
        autoFocus
        autoComplete="off"
        spellCheck
        onFocus={(event) => {
          const end = event.currentTarget.value.length;
          event.currentTarget.setSelectionRange(end, end);
        }}
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
        className="ring-brand bg-surface text-text col-start-1 row-start-1 w-0 min-w-full rounded py-0 ps-0.5 pe-[1.5ch] ring-1 outline-none"
      />
    </span>
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
  // the classes of the icon, shared with the other tools of the row
  buttonClassName: string;
  // the field is open or folded: the parent also folds it when a word is touched
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Search only finds a word and jumps to it. It is an icon: tapping it makes the field grow out of
// the icon towards the start of the row (the other tools stay where they are), tapping it again
// folds the field back, and so does touching anything else. The words typed stay while it is
// folded, but touching a word of the text also empties them (see the transcript view).
// Replacing is a separate tool.
export function SearchTool({
  find,
  onFind,
  matchCount,
  onNext,
  buttonClassName,
  open,
  onOpenChange,
}: SearchToolProps) {
  const t = useTranslations("transcription.edit");
  const field = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  // Open, the field starts where the line of buttons above starts (the first of them) and ends at
  // the icon. The width is set on the element itself (no render), and follows the row.
  useEffect(() => {
    const element = box.current;
    const row = element?.closest<HTMLElement>("[data-tools-row]");
    if (!element || !row) return;
    function fit() {
      if (!element || !row) return;
      if (!open) {
        element.style.width = "0px";
        return;
      }
      const anchor = row.parentElement?.querySelector<HTMLElement>("[data-tools-anchor]");
      const edge = element.getBoundingClientRect();
      const bounds = row.getBoundingClientRect();
      const start = anchor?.getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const rtl = getComputedStyle(row).direction === "rtl";
      // never past the start of the row (the status keeps at least the gap)
      const room = rtl
        ? Math.min(start?.right ?? bounds.right, bounds.right - gap)
        : Math.max(start?.left ?? bounds.left, bounds.left + gap);
      const width = rtl ? room - edge.left : edge.right - room;
      // minus 3px: the border and padding of the frame around the icon
      element.style.width = `${Math.max(0, Math.round(width) - 3)}px`;
    }
    fit();
    if (!open || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    return () => observer.disconnect();
  }, [open]);

  // Touching anything else (the lines, the video, its bar, another tool) folds the field. The
  // words typed stay: the results stay marked while the video plays.
  useEffect(() => {
    if (!open) return;
    function away(event: PointerEvent) {
      if (event.target instanceof Node && !wrap.current?.contains(event.target)) {
        onOpenChange(false);
      }
    }
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, onOpenChange]);

  // the field takes the focus once it is no longer inert
  useEffect(() => {
    if (open) field.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <div
      ref={wrap}
      className="flex min-w-0 items-center"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          onOpenChange(false);
          button.current?.focus();
        }
      }}
    >
      <div
        ref={box}
        role="search"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "relative w-0 min-w-0 overflow-hidden transition-[width,opacity] duration-300 ease-out motion-reduce:transition-none",
          open ? "opacity-100" : "opacity-0",
        )}
      >
        <div
          className={cn(
            "relative origin-right transition-transform duration-300 ease-out motion-reduce:transition-none rtl:origin-left",
            open ? "scale-100" : "scale-x-75",
          )}
        >
          <Input
            ref={field}
            type="search"
            value={find}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            autoComplete="off"
            className="h-11 border-0 sm:h-9 bg-transparent ps-3 pe-16 shadow-none focus-visible:ring-0 [&::-webkit-search-cancel-button]:hidden"
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
              className="text-text-2 absolute end-2 top-1/2 -translate-y-1/2 text-xs"
              aria-live="polite"
            >
              {t("matches", { count: matchCount })}
            </span>
          ) : null}
        </div>
        {/* the line that draws itself under the field, from the icon towards the start */}
        <span
          aria-hidden="true"
          className={cn(
            "bg-brand absolute inset-x-1 bottom-0 h-0.5 origin-right rounded-full transition-transform duration-500 ease-out motion-reduce:transition-none rtl:origin-left",
            open ? "scale-x-100 delay-100" : "scale-x-0",
          )}
        />
      </div>
      <Button
        ref={button}
        type="button"
        variant="ghost"
        size="icon"
        className={cn(buttonClassName, (open || find) && "text-brand")}
        aria-expanded={open}
        aria-label={t("searchLabel")}
        title={t("searchLabel")}
        onClick={() => onOpenChange(!open)}
      >
        <Search aria-hidden="true" />
      </Button>
    </div>
  );
}
