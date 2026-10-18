"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  DEFAULT_PALETTE,
  paletteCookie,
  paletteForPath,
  readPaletteCookie,
  type Palette,
} from "./palette";

type PaletteContextValue = { palette: Palette; setPalette: (palette: Palette) => void };

const PaletteContext = createContext<PaletteContextValue>({
  palette: DEFAULT_PALETTE,
  setPalette: () => undefined,
});

// The cookie is the store: components re-read it when this event fires.
const CHANGE_EVENT = "sg-palette-change";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

// Keeps <html data-palette> in sync with the user's choice (cookie) and the current page:
// the inline head script handles the first paint, this handles client-side navigation and changes.
export function PaletteProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const palette = useSyncExternalStore(
    subscribe,
    () => readPaletteCookie(document.cookie),
    () => DEFAULT_PALETTE,
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-palette", paletteForPath(pathname, palette));
  }, [pathname, palette]);

  const setPalette = useCallback((next: Palette) => {
    document.cookie = paletteCookie(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo(() => ({ palette, setPalette }), [palette, setPalette]);
  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

export function usePalette(): PaletteContextValue {
  return useContext(PaletteContext);
}
