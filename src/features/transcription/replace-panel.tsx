"use client";

import { GripHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type FormEvent, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type PanelPosition = { x: number; y: number };

type ReplacePanelProps = {
  initialPosition: PanelPosition;
  find: string;
  onFind: (value: string) => void;
  matchCount: number;
  // Returns how many words were changed. When something changed, the panel closes itself.
  // The word typed in "Replace with" lives in the parent: it survives closing the panel.
  replacement: string;
  onReplacement: (value: string) => void;
  onReplaceAll: (replacement: string) => number;
  onClose: () => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// A small floating window (no dark overlay, the text stays readable) that can be dragged by its
// top bar to wherever it does not hide the lines being read. Separate from the search bar.
export function ReplacePanel({
  initialPosition,
  find,
  onFind,
  matchCount,
  replacement,
  onReplacement,
  onReplaceAll,
  onClose,
}: ReplacePanelProps) {
  const t = useTranslations("transcription.edit");
  const [position, setPosition] = useState(initialPosition);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const panel = useRef<HTMLElement>(null);
  const grab = useRef<PanelPosition | null>(null);
  const findField = useRef<HTMLInputElement>(null);
  const replaceField = useRef<HTMLInputElement>(null);

  const trimmed = replacement.trim();
  const problem = !find.trim()
    ? t("replaceNeedSearch")
    : matchCount === 0
      ? t("matches", { count: 0 })
      : !trimmed
        ? t("replaceNeedText")
        : /\s/.test(trimmed)
          ? t("replaceNoSpace")
          : null;

  // Never a silent no-op: what is missing is explained and the right field gets the focus.
  function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) {
      setMessage({ error: true, text: problem });
      (find.trim() ? replaceField : findField).current?.focus();
      return;
    }
    const count = onReplaceAll(trimmed);
    if (count > 0) onClose();
    else setMessage({ error: true, text: t("replaceNothing") });
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("button")) return;
    grab.current = { x: event.clientX - position.x, y: event.clientY - position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    if (!grab.current) return;
    const width = panel.current?.offsetWidth ?? 0;
    const height = panel.current?.offsetHeight ?? 0;
    setPosition({
      x: clamp(event.clientX - grab.current.x, 0, Math.max(0, window.innerWidth - width)),
      y: clamp(event.clientY - grab.current.y, 0, Math.max(0, window.innerHeight - height)),
    });
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (!grab.current) return; // a click on a button of the bar is not a drag
    grab.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const status = message?.text ?? (find.trim() ? t("matches", { count: matchCount }) : "");

  return (
    <section
      ref={panel}
      role="dialog"
      aria-labelledby="replace-heading"
      style={{ left: position.x, top: position.y }}
      className="bg-surface border-border fixed z-40 w-[min(20rem,calc(100vw-1rem))] rounded-xl border shadow-lg"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        title={t("replaceDrag")}
        className="border-border flex cursor-grab touch-none items-center justify-between gap-2 border-b py-1 ps-3 pe-1 select-none active:cursor-grabbing"
      >
        <h3
          id="replace-heading"
          className="font-heading flex items-center gap-2 text-base font-bold"
        >
          <GripHorizontal className="text-text-3 size-4" aria-hidden="true" />
          {t("replaceHeading")}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label={t("closeReplace")}
          title={t("closeReplace")}
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3 p-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="replace-find" className="text-text-2 text-xs font-normal">
            {t("replaceFindLabel")}
          </Label>
          <Input
            id="replace-find"
            ref={findField}
            value={find}
            autoFocus
            autoComplete="off"
            className="min-h-10"
            onChange={(event) => {
              onFind(event.target.value);
              setMessage(null);
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="replace-with" className="text-sm font-medium">
            {t("replaceLabel")}
          </Label>
          <Input
            id="replace-with"
            ref={replaceField}
            value={replacement}
            autoComplete="off"
            className="min-h-10"
            onChange={(event) => {
              onReplacement(event.target.value);
              setMessage(null);
            }}
          />
        </div>

        <p
          className={cn("min-h-4 text-xs", message?.error ? "text-danger" : "text-text-2")}
          aria-live="polite"
        >
          {status}
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="min-h-10" onClick={onClose}>
            {t("cancelReplace")}
          </Button>
          <Button type="submit" className="min-h-10">
            {t("replaceAll")}
          </Button>
        </div>
      </form>
    </section>
  );
}
