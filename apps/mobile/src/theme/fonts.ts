/**
 * theme.css loads Archivo as one variable woff2 and dials weight and width per rule
 * (font-weight 800/900, font-stretch up to 112%). React Native has no woff2 support and
 * poor variable-font support, so the four combinations the stylesheet actually uses are
 * shipped as static TTF instances — see assets/fonts/OFL.txt for provenance — and named
 * here as the keys expo-font registers them under.
 */
export const FONTS = {
  extraBold: 'Archivo-ExtraBold-100',
  black: 'Archivo-Black-100',
  blackWide: 'Archivo-Black-108',
  blackWider: 'Archivo-Black-112',
} as const;

export const FONT_ASSETS = {
  [FONTS.extraBold]: require('../../assets/fonts/Archivo-ExtraBold-100.ttf'),
  [FONTS.black]: require('../../assets/fonts/Archivo-Black-100.ttf'),
  [FONTS.blackWide]: require('../../assets/fonts/Archivo-Black-108.ttf'),
  [FONTS.blackWider]: require('../../assets/fonts/Archivo-Black-112.ttf'),
};
