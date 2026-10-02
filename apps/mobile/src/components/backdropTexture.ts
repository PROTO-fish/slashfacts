import type { ImageSourcePropType } from 'react-native';

/** Native apps fill the screen and never show the backdrop, so they ship no texture. */
export const BACKDROP_TEXTURE: { day: ImageSourcePropType; night: ImageSourcePropType } | null = null;
