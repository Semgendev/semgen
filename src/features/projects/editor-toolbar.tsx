"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

// The app header (first line of the page) has named slots that the project page fills from where
// the logic lives: undo / redo and the save status come from the transcript, share and export
// from the page. They are only drawn up there.

export type ToolbarSlotName = "history" | "share" | "export";

const slotId = (name: ToolbarSlotName) => `editor-slot-${name}`;

// The place in the header where the matching portal draws. Empty slots take no room.
export function EditorToolbarSlot({
  name,
  className,
}: {
  name: ToolbarSlotName;
  className?: string;
}) {
  return <div id={slotId(name)} className={className} />;
}

const subscribe = () => () => {};

// Draws its children in the header slot (nothing while the slot is not on screen).
export function ToolbarPortal({ slot, children }: { slot: ToolbarSlotName; children: ReactNode }) {
  const target = useSyncExternalStore(
    subscribe,
    () => document.getElementById(slotId(slot)),
    () => null,
  );
  return target ? createPortal(children, target) : null;
}
