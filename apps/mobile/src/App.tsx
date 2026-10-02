import { useCallback, useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND } from '@slash/core';
import { FONTS, FONT_ASSETS } from './theme/fonts.js';
import { ThemeProvider, usePalette } from './theme/ThemeContext.js';
import { useBreakpoint } from './theme/useBreakpoint.js';
import { useAppState } from './state.js';
import { Home } from './screens/Home.js';
import { Practice } from './screens/Practice.js';
import { Stats } from './screens/Stats.js';
import { Splash } from './components/Splash.js';

type Screen = 'home' | 'practice' | 'stats';

/**
 * Native port of apps/web/src/App.tsx. One screen to choose from, one to play, one to
 * look back at — no navigation bar, since home asks which tables and starts the round, the
 * round returns to it, and FACTS is a page you visit rather than a tab you live in.
 *
 * The palette lives on `settings.night`, which useAppState loads asynchronously from
 * storage, so ThemeProvider has to sit *inside* the component that calls useAppState
 * (here) rather than wrapping it from outside — the RN equivalent of the web version
 * writing `document.documentElement.dataset.theme` in an effect once settings arrive.
 */
function ThemedShell({ onReady }: { onReady: () => void }) {
  const app = useAppState();
  useEffect(() => {
    if (app.ready) onReady();
  }, [app.ready, onReady]);
  return (
    <ThemeProvider night={app.settings.night}>
      <StatusBar style={app.settings.night ? 'light' : 'dark'} />
      <ShellFor app={app} />
    </ThemeProvider>
  );
}

/** Re-renders Shell against the already-created app state, rather than calling
 *  useAppState() a second time and starting a second session. */
function ShellFor({ app }: { app: ReturnType<typeof useAppState> }) {
  const palette = usePalette();
  const { metrics, wordmarkSize } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('home');

  const start = () => {
    app.newRound();
    setScreen('practice');
  };

  return (
    // .app: on a window wider than the card, the ink-coloured backdrop shows on either side,
    // so the shell reads as one phone-width column instead of a header stretched edge to edge.
    <View style={[styles.backdrop, { backgroundColor: palette.ink }]}>
      <View
        style={[
          styles.app,
          { backgroundColor: palette.paper, paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View
          style={[
            styles.bar,
            { borderBottomColor: palette.ink, borderBottomWidth: metrics.border, paddingHorizontal: metrics.padX },
          ]}
        >
          <Text
            style={[
              styles.wordmark,
              {
                color: palette.ink,
                fontFamily: FONTS.blackWider,
                fontSize: wordmarkSize,
                lineHeight: Math.round(wordmarkSize * 0.92),
                letterSpacing: -wordmarkSize * 0.03,
              },
            ]}
          >
            {BRAND.name}
          </Text>
          {screen !== 'home' && (
            // .close is a plain "✕" glyph, not a drawn icon — the one button in the app
            // that isn't.
            <Pressable
              onPress={() => setScreen('home')}
              accessibilityRole="button"
              accessibilityLabel="Back to the start"
              hitSlop={12}
              style={styles.close}
            >
              <Text style={[styles.closeGlyph, { color: palette.ink, fontFamily: FONTS.black }]}>✕</Text>
            </Pressable>
          )}
        </View>

        {!app.ready && <View style={styles.main} />}
        {app.ready && screen === 'home' && <Home app={app} onStart={start} onStats={() => setScreen('stats')} />}
        {app.ready && screen === 'practice' && <Practice app={app} onHome={() => setScreen('home')} />}
        {app.ready && screen === 'stats' && <Stats app={app} onHome={() => setScreen('home')} />}
      </View>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts(FONT_ASSETS);
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);

  // The splash renders before the fonts arrive too: on the web it takes over from the copy
  // index.html shows, and returning null here would blank the page between the two.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {fontsLoaded && <ThemedShell onReady={markReady} />}
        <Splash ready={ready} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  app: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  // Size, line height and tracking scale with the window: useBreakpoint().wordmarkSize.
  wordmark: {},
  close: { padding: 2 },
  // .close { font-size: clamp(1.5rem, 6vw, 2rem) }
  closeGlyph: { fontSize: 28, lineHeight: 28 },
  main: { flex: 1 },
});
