import type { ImageSourcePropType } from 'react-native';

/**
 * public/splash.png, the URL index.html already shows before the bundle runs: reusing it
 * means the browser has it cached by the time this overlay mounts, instead of fetching a
 * second, content-hashed copy of the 1024px original. It is that original scaled to 440px,
 * twice the 220px it is drawn at.
 */
export const SPLASH_IMAGE: ImageSourcePropType = { uri: '/splash.png' };
