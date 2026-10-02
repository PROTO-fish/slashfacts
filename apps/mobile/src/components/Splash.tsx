import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { SPLASH_IMAGE } from './splashImage.js';

/** How long the mark stays up at least, so a fast start still reads as a beat, not a flicker. */
const HOLD_MS = 450;
const FADE_MS = 300;
/** app.json's `imageWidth` for expo-splash-screen, and index.html's <img> width. */
const SIZE = 220;

// Keep the native splash up past the first frame; it comes down once this overlay, which
// looks the same, is on screen to take over. A no-op on the web.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * The opening beat: the brand mark on white, then a short fade into the app. Drawn over
 * everything rather than instead of it, so fonts and saved progress load underneath and
 * the first screen is already there when it fades. Always white, even in night mode,
 * because the native splash before it is.
 */
export function Splash({ ready }: { ready: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [held, setHeld] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHeld(true), HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || !held) return;
    Animated.timing(progress, {
      toValue: 1,
      duration: FADE_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => setGone(true));
  }, [ready, held, progress]);

  if (gone) return null;

  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.screen, { opacity }]}>
      <Animated.Image
        source={SPLASH_IMAGE}
        resizeMode="contain"
        onLoadEnd={() => SplashScreen.hideAsync().catch(() => {})}
        style={[styles.mark, { transform: [{ scale }] }]}
        accessibilityIgnoresInvertColors
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  mark: { width: SIZE, height: SIZE },
});
