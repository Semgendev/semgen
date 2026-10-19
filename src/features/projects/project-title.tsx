"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { renameProjectAction } from "./actions";
import { shortTitle } from "./short-title";

// Saves a moment after the last keystroke (and at once when the field loses focus).
const SAVE_DELAY_MS = 700;

// The project name, small and centred above the video. The pointer turns into a text cursor over
// it; one click selects the whole name, a second click puts the cursor where you want it. Every
// change is saved on its own, without reloading the page, and the new name stays on screen.
export function ProjectTitle({ projectId, title }: { projectId: string; title: string }) {
  const t = useTranslations("projects");
  const [name, setName] = useState(title);
  const [editing, setEditing] = useState(false);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const saved = useRef(title);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function save(next: string) {
    const value = next.trim();
    if (value === "" || value === saved.current) return;
    setFailed(false);
    const result = await renameProjectAction(projectId, value);
    if (result.ok) {
      saved.current = value;
    } else {
      setFailed(true);
      setName(saved.current);
    }
  }

  function onChange(next: string) {
    setName(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(next), SAVE_DELAY_MS);
  }

  function finish() {
    if (timer.current) clearTimeout(timer.current);
    setEditing(false);
    if (name.trim() === "") setName(saved.current);
    else void save(name);
  }

  return (
    <h1 className="mx-auto w-full max-w-md min-w-0 text-center text-xs font-medium">
      {editing ? (
        <input
          ref={input}
          value={name}
          maxLength={120}
          aria-label={t("titleLabel")}
          onChange={(event) => onChange(event.target.value)}
          onBlur={finish}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              if (timer.current) clearTimeout(timer.current);
              setName(saved.current);
              setEditing(false);
            }
          }}
          className="border-border focus:border-brand text-text w-full truncate border-b bg-transparent px-1 py-1 text-center outline-none"
        />
      ) : (
        <button
          type="button"
          title={name}
          onClick={() => {
            setEditing(true);
            requestAnimationFrame(() => input.current?.select());
          }}
          className="text-text-2 focus-visible:ring-ring block w-full cursor-text truncate rounded px-1 py-1 outline-none focus-visible:ring-2"
        >
          {shortTitle(name)}
        </button>
      )}
      {failed ? (
        <span role="alert" className="text-danger block text-xs font-normal">
          {t("errors.unknown")}
        </span>
      ) : null}
    </h1>
  );
}
