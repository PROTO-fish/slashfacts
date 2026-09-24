import { useEffect, useState } from 'react';
import { BRAND } from '@slash/core';
import { useAppState } from './state.js';
import { Home } from './screens/Home.js';
import { Practice } from './screens/Practice.js';
import { Stats } from './screens/Stats.js';

type Screen = 'home' | 'practice' | 'stats';

/**
 * One screen to choose from, one to play, one to look back at. There is no navigation bar:
 * home asks which tables and starts the round, the round returns to it, and STATS is a page
 * you visit rather than a tab you live in. In a run the only control is the way out — a
 * child has to be able to abandon a round.
 */
export function App() {
  const app = useAppState();
  const [screen, setScreen] = useState<Screen>('home');

  // On the document element, not on .app: the page background sits behind the safe-area
  // insets and the overscroll gutter, and both would stay white otherwise.
  useEffect(() => {
    document.documentElement.dataset.theme = app.settings.night ? 'night' : 'day';
  }, [app.settings.night]);

  const start = () => {
    // A finished round would otherwise put the score screen up instead of a question.
    app.newRound();
    setScreen('practice');
  };

  return (
    <div className="app">
      <header className="bar">
        <h1 className="wordmark">{BRAND.name}</h1>
        {screen !== 'home' && (
          <button className="close" aria-label="Back to the start" onClick={() => setScreen('home')}>
            ✕
          </button>
        )}
      </header>

      {!app.ready && <main />}
      {app.ready && screen === 'home' && (
        <Home
          app={app}
          onStart={start}
          onStats={() => setScreen('stats')}
        />
      )}
      {app.ready && screen === 'practice' && (
        <Practice app={app} onHome={() => setScreen('home')} />
      )}
      {app.ready && screen === 'stats' && <Stats app={app} onHome={() => setScreen('home')} />}
    </div>
  );
}
