import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  armQuestion,
  DEFAULT_SETTINGS,
  fromPersisted,
  sanitizeTables,
  startSession,
  submitAnswer,
  toPersisted,
  type FactId,
  type FactStat,
  type Session,
  type Settings,
} from '@slash/core';
import { webStorage } from './storage/idb.js';

export interface AppState {
  ready: boolean;
  stats: ReadonlyMap<FactId, FactStat>;
  settings: Settings;
  session: Session | null;
  setSettings: (next: Settings) => void;
  /** Grade a stroke. The caller animates; this only moves the model forward. */
  answer: (digits: number[]) => { correct: boolean; expected: readonly number[] };
  newRound: () => void;
  /** Called when the next question actually appears, to start its clock. */
  armQuestion: () => void;
  reset: () => void;
}

/**
 * Everything the UI knows. The rules all live in @slash/core — this hook just holds the
 * current values, persists them, and hands strokes to the engine.
 */
export function useAppState(): AppState {
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<ReadonlyMap<FactId, FactStat>>(new Map());
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [session, setSession] = useState<Session | null>(null);

  // The engine is pure, so pending grades are applied synchronously against refs and the
  // React state follows. This keeps rapid-fire answers from racing the render cycle.
  const statsRef = useRef(stats);
  const sessionRef = useRef(session);
  const settingsRef = useRef(settings);
  statsRef.current = stats;
  sessionRef.current = session;
  settingsRef.current = settings;

  useEffect(() => {
    let cancelled = false;
    webStorage.load().then((persisted) => {
      if (cancelled) return;
      const restored = fromPersisted(persisted);
      // Progress saved before a table was removed can still name it.
      const saved = restored.settings;
      // Defaults first: settings saved before a preference existed carry no value for it.
      const nextSettings = saved
        ? { ...DEFAULT_SETTINGS, ...saved, tables: sanitizeTables(saved.tables) }
        : DEFAULT_SETTINGS;
      setStats(restored.stats);
      setSettingsState(nextSettings);
      setSession(startSession(restored.stats, nextSettings, Date.now()));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((nextStats: ReadonlyMap<FactId, FactStat>, nextSettings: Settings) => {
    void webStorage.save(toPersisted(nextStats, nextSettings));
  }, []);

  const answer = useCallback(
    (digits: number[]) => {
      const current = sessionRef.current;
      if (!current) return { correct: false, expected: [] as readonly number[] };
      const result = submitAnswer(
        current,
        statsRef.current,
        settingsRef.current,
        digits,
        Date.now(),
      );
      statsRef.current = result.stats;
      sessionRef.current = result.session;
      setStats(result.stats);
      setSession(result.session);
      persist(result.stats, settingsRef.current);
      return { correct: result.correct, expected: result.expected };
    },
    [persist],
  );

  const setSettings = useCallback(
    (next: Settings) => {
      settingsRef.current = next;
      setSettingsState(next);
      persist(statsRef.current, next);
      const fresh = startSession(statsRef.current, next, Date.now());
      sessionRef.current = fresh;
      setSession(fresh);
    },
    [persist],
  );

  const arm = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.done) return;
    const armed = armQuestion(current, Date.now());
    sessionRef.current = armed;
    setSession(armed);
  }, []);

  const newRound = useCallback(() => {
    const fresh = startSession(statsRef.current, settingsRef.current, Date.now());
    sessionRef.current = fresh;
    setSession(fresh);
  }, []);

  const reset = useCallback(() => {
    const empty = new Map<FactId, FactStat>();
    statsRef.current = empty;
    setStats(empty);
    void webStorage.clear();
    const fresh = startSession(empty, settingsRef.current, Date.now());
    sessionRef.current = fresh;
    setSession(fresh);
  }, []);

  return useMemo(
    () => ({
      ready,
      stats,
      settings,
      session,
      setSettings,
      answer,
      newRound,
      armQuestion: arm,
      reset,
    }),
    [ready, stats, settings, session, setSettings, answer, newRound, arm, reset],
  );
}
