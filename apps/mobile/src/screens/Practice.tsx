import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ANSWER_LIMIT_MS, parseFactId, product, summarizeRound } from '@slash/core';
import { usePalette } from '../theme/ThemeContext.js';
import { FONTS } from '../theme/fonts.js';
import { useBreakpoint } from '../theme/useBreakpoint.js';
import { Result } from '../components/Result.js';
import { Launch } from '../components/Launch.js';
import { RestartIcon, BackIcon } from '../components/icons.js';
import { useQuestionLoop } from '../game/useQuestionLoop.js';
import { QuestionView } from '../game/QuestionView.js';
import type { AppState } from '../state.js';

/**
 * Native port of apps/web/src/screens/Practice.tsx. The round: deliberately biased, since
 * the scheduler asks for what is missed or slow more often — see summarizeRound.
 */
export function Practice({ app, onHome }: { app: AppState; onHome: () => void }) {
  const palette = usePalette();
  const { metrics } = useBreakpoint();
  const { session, settings } = app;
  const live = session && !session.done ? parseFactId(session.current) : null;

  const loop = useQuestionLoop({
    fact: live,
    askedAt: session && !session.done ? session.askedAt : 0,
    limitMs: ANSWER_LIMIT_MS,
    haptics: settings.haptics,
    onGrade: useCallback((digits: number[]) => app.answer(digits), [app]),
    onAdvance: useCallback(() => app.armQuestion(), [app]),
  });

  if (!session) return <View style={styles.screen} />;

  // The final question keeps its feedback before the score takes over.
  if (session.done && loop.status === 'idle') {
    return (
      <View style={[styles.screen, { paddingHorizontal: metrics.padX }]}>
        <ScrollView style={styles.doneScroll} contentContainerStyle={styles.doneMain}>
          <Text style={[styles.pageTitle, { color: palette.ink, fontFamily: FONTS.blackWider }]}>SESSION</Text>
          <Result score={summarizeRound(session)} />
          {session.missed.length > 0 && (
            <View style={[styles.missedPanel, { borderColor: palette.ink, borderWidth: metrics.border }]}>
              <Text style={[styles.panelTitle, { color: palette.ink, fontFamily: FONTS.black }]}>MISSED</Text>
              <View style={[styles.missedList, { borderTopColor: palette.ink }]}>
                {session.missed.map((id) => {
                  const fact = parseFactId(id);
                  return (
                    <Text key={id} style={[styles.missedItem, { color: palette.ink, fontFamily: FONTS.black }]}>
                      {fact.a}×{fact.b}={product(fact)}
                    </Text>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* .actions: a full-width column, filled AGAIN over outlined HOME — not side by
            side, so the primary action keeps the same shape it has everywhere else. */}
        <View style={styles.actions}>
          <Launch
            onPress={app.newRound}
            accessibilityLabel="Start another round"
            icon={<RestartIcon size={26} color={palette.paper} />}
          />
          <Launch
            onPress={onHome}
            secondary
            accessibilityLabel="Home"
            icon={<BackIcon size={20} color={palette.ink} />}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingHorizontal: metrics.padX }]}>
      <View style={styles.practice}>
        {loop.displayedFact && (
          <QuestionView
            fact={loop.displayedFact}
            status={loop.status}
            pending={loop.pending}
            attempt={loop.attempt}
            index={Math.min(session.index, session.total - 1)}
            total={session.total}
            limitMs={ANSWER_LIMIT_MS}
            askedAt={session.askedAt}
            onSlash={loop.onSlash}
            onTap={loop.onTap}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', paddingTop: 16, paddingBottom: 18 },
  practice: { flex: 1, width: '100%', maxWidth: 420 },
  doneScroll: { flex: 1, width: '100%', maxWidth: 420 },
  // flexGrow centers a short summary; a long one scrolls instead of sliding under the bar.
  doneMain: { flexGrow: 1, gap: 14, justifyContent: 'center', paddingBottom: 4 },
  // .page-title
  pageTitle: { fontSize: 44, lineHeight: 40, letterSpacing: -1, marginBottom: 4 },
  missedPanel: { padding: 14, gap: 8 },
  panelTitle: { fontSize: 17, letterSpacing: -0.2 },
  // .score-missed .misses: column, gap 6, one fact per line, centered, ruled above.
  missedList: { gap: 6, paddingTop: 6, borderTopWidth: 2 },
  missedItem: { fontSize: 22, letterSpacing: -0.5, textAlign: 'center' },
  actions: { width: '100%', maxWidth: 420, gap: 10, marginTop: 18 },
});
