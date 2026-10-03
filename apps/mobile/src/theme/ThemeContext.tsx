import { DAY, type Palette } from './tokens.js';

/**
 * The app is day only: black ink on white paper. Styles still ask for their colours here
 * rather than hard-coding them, so the two-colour discipline stays in one place.
 */
export function usePalette(): Palette {
  return DAY;
}
