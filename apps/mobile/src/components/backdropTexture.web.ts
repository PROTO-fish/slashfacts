import type { ImageSourcePropType } from 'react-native';

/**
 * Crumpled black paper behind the framed card on a desktop window, as seamless tiles from
 * scripts/generate-backdrop.mjs. The night tile is the same paper inverted, for the white
 * ink backdrop.
 */
export const BACKDROP_TEXTURE: { day: ImageSourcePropType; night: ImageSourcePropType } | null = {
  day: require('../../assets/backdrop/crumple-day.png'),
  night: require('../../assets/backdrop/crumple-night.png'),
};
