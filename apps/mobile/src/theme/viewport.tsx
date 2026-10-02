import { createContext, useContext, type ReactNode } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * The size the app is laid out in. On a phone that is the window. In a desktop browser
 * the window is far taller and wider than any phone, and stretching a phone layout over
 * it leaves the table grid floating in a tall empty column — so the app is drawn in a
 * phone-shaped frame instead, and every screen sizes itself against that frame rather
 * than the window.
 */
export interface Viewport {
  readonly width: number;
  readonly height: number;
  /** True when the app sits in a phone frame on a bigger window. */
  readonly framed: boolean;
}

/** 9:19.5 — the shape of every current iPhone and most Android phones, which is the
 *  shape the screens were tuned on. */
const PHONE_RATIO = 9 / 19.5;
/** 430×932 is the largest phone the layout targets (iPhone Pro Max); no bigger frame. */
const FRAME_MAX_HEIGHT = 932;
/** Below this the frame would be narrower than the smallest phone the layout handles. */
const FRAME_MIN_WIDTH = 360;
/** Room left above and below the frame, so it reads as an object on the page. */
const FRAME_MARGIN = 24;
/** A window smaller than this in either direction is a phone (or close enough) — fill it. */
const FRAME_FROM = 600;

export function viewportFor(width: number, height: number): Viewport {
  if (Platform.OS !== 'web' || width < FRAME_FROM || height < FRAME_FROM) {
    return { width, height, framed: false };
  }
  const frameHeight = Math.min(FRAME_MAX_HEIGHT, height - FRAME_MARGIN * 2);
  const frameWidth = Math.max(FRAME_MIN_WIDTH, Math.round(frameHeight * PHONE_RATIO));
  return { width: frameWidth, height: frameHeight, framed: true };
}

const ViewportContext = createContext<Viewport | null>(null);

export function ViewportProvider({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  return <ViewportContext.Provider value={viewportFor(width, height)}>{children}</ViewportContext.Provider>;
}

/** The frame's size when framed, the window's otherwise. Use this, not useWindowDimensions. */
export function useViewport(): Viewport {
  const viewport = useContext(ViewportContext);
  const window = useWindowDimensions();
  return viewport ?? { width: window.width, height: window.height, framed: false };
}
