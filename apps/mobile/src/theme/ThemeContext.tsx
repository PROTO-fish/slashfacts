import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DAY, NIGHT, type Palette } from './tokens.js';

const PaletteContext = createContext<Palette>(DAY);

/**
 * App.tsx owns `night` as part of Settings (persisted, same as the web app); this context
 * just makes the resulting palette available without threading it through every prop list.
 */
export function ThemeProvider({ night, children }: { night: boolean; children: ReactNode }) {
  const palette = useMemo(() => (night ? NIGHT : DAY), [night]);
  return <PaletteContext.Provider value={palette}>{children}</PaletteContext.Provider>;
}

export function usePalette(): Palette {
  return useContext(PaletteContext);
}
