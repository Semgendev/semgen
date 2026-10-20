"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BringToFront,
  RotateCcw,
  SendToBack,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { MOVE_STEP_PCT, type Move } from "./moves";

// Holding an arrow keeps moving the text: a first step at once, then a steady repeat.
const REPEAT_DELAY_MS = 350;
const REPEAT_EVERY_MS = 70;
// Shift + an arrow key moves five times further.
const BIG_STEP = 5;

function useRepeat(action: () => void) {
  const latest = useRef(action);
  useEffect(() => {
    latest.current = action;
  });
  const timers = useRef<{
    wait?: ReturnType<typeof setTimeout>;
    every?: ReturnType<typeof setInterval>;
  }>({});
  const stop = () => {
    clearTimeout(timers.current.wait);
    clearInterval(timers.current.every);
    timers.current = {};
  };
  useEffect(() => stop, []);
  return {
    onPointerDown: (event: React.PointerEvent) => {
      if (event.button !== 0) return;
      latest.current();
      stop();
      timers.current.wait = setTimeout(() => {
        timers.current.every = setInterval(() => latest.current(), REPEAT_EVERY_MS);
      }, REPEAT_DELAY_MS);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    // keyboard (Enter / Space on the focused arrow): one step
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        latest.current();
      }
    },
  };
}

function Arrow({
  label,
  onStep,
  className,
  children,
}: {
  label: string;
  onStep: () => void;
  className: string;
  children: ReactNode;
}) {
  const repeat = useRepeat(onStep);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...repeat}
      className={cn(
        "bg-surface border-border text-text hover:border-brand-border hover:text-brand focus-visible:ring-focus absolute flex size-11 touch-none items-center justify-center rounded-full border shadow-sm transition-colors outline-none select-none focus-visible:ring-2 active:scale-95",
        className,
      )}
    >
      {children}
    </button>
  );
}

// A round pad: four arrows around a button that puts the text back in its place.
function DirectionPad({
  onShift,
  onReset,
  canReset,
}: {
  onShift: (dx: number, dy: number) => void;
  onReset: () => void;
  canReset: boolean;
}) {
  const t = useTranslations("captions.move");
  return (
    <div
      role="group"
      aria-label={t("pad")}
      className="border-border bg-surface-2 relative size-36 shrink-0 rounded-full border"
    >
      <Arrow
        label={t("up")}
        onStep={() => onShift(0, -MOVE_STEP_PCT)}
        className="top-1 left-1/2 -translate-x-1/2"
      >
        <ArrowUp className="size-5" aria-hidden="true" />
      </Arrow>
      <Arrow
        label={t("down")}
        onStep={() => onShift(0, MOVE_STEP_PCT)}
        className="bottom-1 left-1/2 -translate-x-1/2"
      >
        <ArrowDown className="size-5" aria-hidden="true" />
      </Arrow>
      <Arrow
        label={t("left")}
        onStep={() => onShift(-MOVE_STEP_PCT, 0)}
        className="top-1/2 left-1 -translate-y-1/2"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Arrow>
      <Arrow
        label={t("right")}
        onStep={() => onShift(MOVE_STEP_PCT, 0)}
        className="top-1/2 right-1 -translate-y-1/2"
      >
        <ArrowRight className="size-5" aria-hidden="true" />
      </Arrow>
      <button
        type="button"
        aria-label={t("reset")}
        title={t("reset")}
        disabled={!canReset}
        onClick={onReset}
        className="bg-brand text-on-brand focus-visible:ring-focus absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-sm transition-opacity outline-none focus-visible:ring-2 disabled:opacity-35"
      >
        <RotateCcw className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label
      className={cn(
        "border-border flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3 py-2",
        checked && "border-brand bg-brand/10",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-brand mt-0.5 size-5 shrink-0"
      />
      <span className="flex flex-col">
        <span className="text-text text-sm font-medium">{label}</span>
        <span className="text-text-3 text-xs">{hint}</span>
      </span>
    </label>
  );
}

// Moving the text picked on the video: arrows (or a drag on the video), in front / behind, and the
// choice between this block only and every block of the video.
export function MovePanel({
  text,
  isKeyWord,
  layer,
  canReset,
  everyBlock,
  apart,
  showApart,
  onShift,
  onReset,
  onLayer,
  onEveryBlock,
  onApart,
  onDone,
}: {
  // the words of the picked text, shown in the title
  text: string;
  isKeyWord: boolean;
  layer: Move["layer"];
  canReset: boolean;
  everyBlock: boolean;
  apart: boolean;
  // "keep this block apart" only means something once a move applies to every block
  showApart: boolean;
  onShift: (dx: number, dy: number) => void;
  onReset: () => void;
  onLayer: (layer: "front" | "back") => void;
  onEveryBlock: (everyBlock: boolean) => void;
  onApart: (apart: boolean) => void;
  onDone: () => void;
}) {
  const t = useTranslations("captions.move");

  // Arrow keys move the text while the panel is open (Shift = bigger steps), Escape closes it.
  const shift = useRef(onShift);
  const done = useRef(onDone);
  useEffect(() => {
    shift.current = onShift;
    done.current = onDone;
  });
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      // another window open on top (a dialog): its own Escape, not this one
      if (document.querySelector("[role=dialog]")) return;
      if (event.key === "Escape") {
        done.current();
        return;
      }
      const step = MOVE_STEP_PCT * (event.shiftKey ? BIG_STEP : 1);
      const moves: Record<string, [number, number]> = {
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
      };
      const move = moves[event.key];
      if (!move) return;
      event.preventDefault();
      shift.current(move[0], move[1]);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // the controls get the keyboard focus as soon as they open
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      ref={panel}
      aria-labelledby="move-panel-title"
      className="flex flex-col gap-3 lg:gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="move-panel-title" className="text-text text-base font-semibold">
            {isKeyWord ? t("titleKeyWord") : t("title")}
          </h3>
          <p className="text-text-2 truncate text-sm">« {text} »</p>
        </div>
        <button
          type="button"
          onClick={onDone}
          aria-label={t("done")}
          title={t("done")}
          className="text-text-2 hover:text-text hover:bg-surface-2 focus-visible:ring-focus flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-row items-center gap-4 sm:gap-6">
        <DirectionPad onShift={onShift} onReset={onReset} canReset={canReset} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-text-2 text-xs font-medium">{t("layer")}</p>
          <div role="group" aria-label={t("layer")} className="grid grid-cols-1 gap-2">
            {(
              [
                ["front", BringToFront, t("front")],
                ["back", SendToBack, t("back")],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={layer === value}
                onClick={() => onLayer(value)}
                className={cn(
                  "focus-visible:ring-focus flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm transition-colors outline-none focus-visible:ring-2",
                  layer === value
                    ? "border-brand bg-brand/10 text-text font-semibold"
                    : "border-border text-text-2 hover:border-brand-border hover:text-text",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Toggle
          checked={everyBlock && !apart}
          disabled={apart}
          onChange={onEveryBlock}
          label={t("everyBlock")}
          hint={apart ? t("everyBlockApart") : t("everyBlockHint")}
        />
        {showApart ? (
          <Toggle checked={apart} onChange={onApart} label={t("apart")} hint={t("apartHint")} />
        ) : null}
      </div>
    </section>
  );
}
