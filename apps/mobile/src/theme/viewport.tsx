import { createContext, useContext, type ReactNode } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * The size the app is laid out in. On a phone that is the window. In a desktop browser
 * the window is far taller and wider than any phone, and stretching a phone layout over
 * it leaves the table grid floating in a tall empty column — so the app is drawn in a
 * phone-shaped frame instead, and every screen sizes itself against that frame rather
 * than the window. A native tablet gets the same idea in its own form: a full-height paper
 * column, zoomed (see tabletScale), on the same backdrop.
 */
export interface Viewport {
  readonly width: number;
  readonly height: number;
  /** True when the app sits in a phone frame on a bigger window. */
  readonly framed: boolean;
  /** True on a tablet, where the app is a full-height paper column on the backdrop. */
  readonly columned: boolean;
  /** How many window points one layout point takes. 1 on a phone; above 1 on a tablet,
   *  where width and height above are the window divided by it — see useUiScale(). */
  readonly scale: number;
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

/** A portrait tablet this wide (in window points) zooms its column 1×; the 452pt column
 *  then takes about two thirds of the screen at any size. */
const TABLET_LAYOUT_WIDTH = 688;
/** 13-inch iPad in portrait. Past this the column only gets coarser, not more readable. */
const TABLET_MAX_SCALE = 1.5;
/** iPad mini in landscape lands here: the tables and the pad stay finger-sized. */
const TABLET_MIN_SCALE = 0.8;
/** The tablet column, in layout points: Home's 420pt grid and its 16pt margins. */
const TABLET_COLUMN_WIDTH = 452;

/**
 * On a tablet the phone layout is not stretched or framed but zoomed: every size grows by
 * one factor, so the tables, the pad and the type keep the proportions they were tuned at.
 * On a 13-inch iPad (1032pt) that is 1.5, and the 452pt column draws 678pt wide.
 * A landscape window is held to its height's share — 0.75 of it, so the layout always has
 * the ~917pt of height a tall phone gives it — and on a short one that zooms out rather than
 * in: the phone layout was never asked to fit a 744pt-tall screen, and doesn't.
 */
function tabletScale(width: number, height: number): number {
  const fit = Math.min(width, height * 0.75) / TABLET_LAYOUT_WIDTH;
  return Math.min(TABLET_MAX_SCALE, Math.max(TABLET_MIN_SCALE, fit));
}

export function viewportFor(width: number, height: number): Viewport {
  if (width < FRAME_FROM || height < FRAME_FROM) {
    return { width, height, framed: false, columned: false, scale: 1 };
  }
  if (Platform.OS !== 'web') {
    // A tablet: the app is a paper column on the backdrop, the full height of the window and
    // a phone's width, zoomed. Every screen lays out against the column exactly as it does on
    // a phone; whatever width is left over is backdrop.
    const scale = tabletScale(width, height);
    return {
      width: Math.min(TABLET_COLUMN_WIDTH, width / scale),
      height: height / scale,
      framed: false,
      columned: true,
      scale,
    };
  }
  const frameHeight = Math.min(FRAME_MAX_HEIGHT, height - FRAME_MARGIN * 2);
  const frameWidth = Math.max(FRAME_MIN_WIDTH, Math.round(frameHeight * PHONE_RATIO));
  return { width: frameWidth, height: frameHeight, framed: true, columned: false, scale: 1 };
}

const ViewportContext = createContext<Viewport | null>(null);

export function ViewportProvider({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  return <ViewportContext.Provider value={viewportFor(width, height)}>{children}</ViewportContext.Provider>;
}

/** The frame's size when framed, the column's on a tablet, the window's otherwise — in
 *  layout points (see scale). Use this, not useWindowDimensions. */
export function useViewport(): Viewport {
  const viewport = useContext(ViewportContext);
  const window = useWindowDimensions();
  return viewport ?? { width: window.width, height: window.height, framed: false, columned: false, scale: 1 };
}

/** The tablet zoom: multiply any size written for a phone by this before drawing it. */
export function useUiScale(): number {
  return useViewport().scale;
}
