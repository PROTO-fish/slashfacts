import type { ImageSourcePropType } from 'react-native';

/**
 * Crumpled black paper behind the app wherever it doesn't fill the window — the framed card
 * on a desktop browser, the paper column on a tablet — as a seamless tile from
 * scripts/generate-backdrop.mjs.
 */
export const BACKDROP_TEXTURE: ImageSourcePropType = require('../../assets/backdrop/crumple-day.png');
