"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  Suspense,
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

// Keeps <html data-palette> in sync with the current page. It renders nothing and sits in its own
// Suspense boundary: the page address is only known at request time, and must not hold back the page.
function PaletteSync({ palette }: { palette: Palette }) {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.setAttribute("data-palette", paletteForPath(pathname, palette));
  }, [pathname, palette]);
  return null;
}

// Holds the user's choice (cookie): the inline head script handles the first paint, PaletteSync
// handles client-side navigation and changes.
export function PaletteProvider({ children }: { children: ReactNode }) {
  const palette = useSyncExternalStore(
    subscribe,
    () => readPaletteCookie(document.cookie),
    () => DEFAULT_PALETTE,
  );

  const setPalette = useCallback((next: Palette) => {
    document.cookie = paletteCookie(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo(() => ({ palette, setPalette }), [palette, setPalette]);
  return (
    <PaletteContext.Provider value={value}>
      <Suspense fallback={null}>
        <PaletteSync palette={palette} />
      </Suspense>
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette(): PaletteContextValue {
  return useContext(PaletteContext);
}
