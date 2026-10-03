import { useCallback, useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND } from '@slash/core';
import { FONTS, FONT_ASSETS } from './theme/fonts.js';
import { usePalette } from './theme/ThemeContext.js';
import { useBreakpoint } from './theme/useBreakpoint.js';
import { ViewportProvider, useViewport } from './theme/viewport.js';
import { useAppState } from './state.js';
import { Home } from './screens/Home.js';
import { Practice } from './screens/Practice.js';
import { Stats } from './screens/Stats.js';
import { About } from './screens/About.js';
import { Splash } from './components/Splash.js';
import { BACKDROP_TEXTURE } from './components/backdropTexture.js';

type Screen = 'home' | 'practice' | 'stats' | 'about';

/**
 * Native port of apps/web/src/App.tsx. One screen to choose from, one to play, one to
 * look back at — no navigation bar, since home asks which tables and starts the round, the
 * round returns to it, and FACTS is a page you visit rather than a tab you live in. ABOUT,
 * reached from the PROTO/fish mark on home, is the same kind of page.
 *
 * Day only: black ink on white paper, with a dark status bar.
 */
function AppShell({ onReady }: { onReady: () => void }) {
  const app = useAppState();
  useEffect(() => {
    if (app.ready) onReady();
  }, [app.ready, onReady]);
  return (
    <>
      <StatusBar style="dark" />
      <ShellFor app={app} />
    </>
  );
}

/** Re-renders Shell against the already-created app state, rather than calling
 *  useAppState() a second time and starting a second session. */
function ShellFor({ app }: { app: ReturnType<typeof useAppState> }) {
  const palette = usePalette();
  const { metrics, wordmarkSize } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const viewport = useViewport();
  // A framed card's rounded corners would clip the wordmark at the usual padding.
  const cornerRadius = viewport.framed ? Math.round(viewport.height * 0.04) : 0;
  const barPadX = Math.max(metrics.padX, Math.round(cornerRadius * 0.55));
  const [screen, setScreen] = useState<Screen>('home');

  const start = () => {
    app.newRound();
    setScreen('practice');
  };

  return (
    // On a desktop window the app is drawn as a phone-shaped card centred on the ink
    // backdrop (see viewport.tsx), rather than a phone-width column stretched to the
    // window's full height.
    <View style={[styles.backdrop, viewport.framed && styles.backdropFramed, { backgroundColor: palette.ink }]}>
      {viewport.framed && BACKDROP_TEXTURE && (
        <Image
          source={BACKDROP_TEXTURE}
          resizeMode="repeat"
          // Explicit size: on web an asset's own dimensions otherwise win over absoluteFill,
          // and the tile is drawn once in the corner instead of repeated.
          style={[StyleSheet.absoluteFill, styles.fill]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
      <View
        style={[
          // A framed card takes its size from the viewport and must not flex: on web,
          // `flex` sets flex-basis, which a flex column honours over `height`.
          // Its corners round like a phone screen's: ~55pt on a 932pt-tall iPhone.
          viewport.framed
            ? {
                width: viewport.width,
                height: viewport.height,
                borderRadius: cornerRadius,
                overflow: 'hidden',
              }
            : styles.app,
          { backgroundColor: palette.paper, paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View
          style={[
            styles.bar,
            { borderBottomColor: palette.ink, borderBottomWidth: metrics.border, paddingHorizontal: barPadX },
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
        {app.ready && screen === 'home' && (
          <Home app={app} onStart={start} onStats={() => setScreen('stats')} onAbout={() => setScreen('about')} />
        )}
        {app.ready && screen === 'practice' && <Practice app={app} onHome={() => setScreen('home')} />}
        {app.ready && screen === 'stats' && <Stats app={app} onHome={() => setScreen('home')} />}
        {app.ready && screen === 'about' && <About onHome={() => setScreen('home')} />}
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
        {fontsLoaded && (
          <ViewportProvider>
            <AppShell onReady={markReady} />
          </ViewportProvider>
        )}
        <Splash ready={ready} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  backdropFramed: { alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
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
