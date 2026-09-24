import { useCallback } from 'react';
import { ANSWER_LIMIT_MS, parseFactId, product, summarizeRound } from '@slash/core';
import { Result } from '../components/Result.js';
import { useQuestionLoop } from '../game/useQuestionLoop.js';
import { QuestionView } from '../game/QuestionView.js';
import type { AppState } from '../state.js';

/**
 * The round. Deliberately biased: the scheduler asks for what is missed or slow more often,
 * so what it reports describes the round rather than the child. See summarizeRound.
 */
export function Practice({ app, onHome }: { app: AppState; onHome: () => void }) {
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

  if (!session) return <main />;

  // The final question keeps its feedback before the score takes over.
  if (session.done && loop.status === 'idle') {
    return (
      <main>
        <div className="done">
          <div className="done-main">
            <h2 className="page-title">SESSION</h2>

            {/*
             * Counted over first tries only. Every fact is answered right in the end here —
             * the round does not move on until it is — so counting them all would report a
             * flat 100% and a mean that includes answers copied off the screen.
             */}
            <Result score={summarizeRound(session)} />

            {session.missed.length > 0 && (
              <div className="panel score-panel score-missed">
                <h3 className="panel-title">MISSED</h3>
                <p className="misses">
                  {session.missed.map((id) => {
                    const fact = parseFactId(id);
                    return (
                      <span key={id}>
                        {fact.a}×{fact.b}={product(fact)}
                      </span>
                    );
                  })}
                </p>
              </div>
            )}
          </div>

          <div className="actions">
            <button className="launch restart" onClick={app.newRound} aria-label="Start another round">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15A9 9 0 1 1 18.36 5.64L23 10" />
              </svg>
            </button>
            <button className="launch second back" onClick={onHome} aria-label="Home">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 12H4M4 12L11 5M4 12L11 19" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="practice">
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
      </div>
    </main>
  );
}
