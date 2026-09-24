import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState as RNAppState } from 'react-native';
import { answerDigits, type Fact } from '@slash/core';
import type { PadStatus } from '../slash/SlashPad.js';
import { tapCorrect, tapWrong } from '../haptics.js';

/** Long enough to register as a confirmation, short enough to keep the loop tight. */
export const HOLD_CORRECT_MS = 320;
/** Long enough to read the answer, short enough that missing one is not a punishment. */
export const REVEAL_MS = 550;

interface Options {
  /** The question being asked, or null when there is nothing to ask. */
  fact: Fact | null;
  /** Epoch ms when this question went up. Drives the clock. */
  askedAt: number;
  /** The answer limit for this mode. */
  limitMs: number;
  haptics: boolean;
  /**
   * Grade an answer. An empty list means the clock ran out. Called exactly once per
   * question, from an effect-free path — never from inside a state updater.
   */
  onGrade: (digits: number[]) => { correct: boolean };
  /** Called when the feedback is over and the next question should go up. */
  onAdvance: () => void;
}

export interface QuestionLoop {
  status: PadStatus;
  /** The fact the screen belongs to: frozen for the length of the feedback. */
  displayedFact: Fact | null;
  pending: number[];
  /** Counts finished questions. The pad's reset signal. */
  attempt: number;
  onSlash: (digits: number[]) => void;
  onTap: (digit: number) => void;
}

/**
 * Native port of apps/web/src/game/useQuestionLoop.ts. Logic and the two invariants below
 * are unchanged; only the platform hooks differ (setTimeout is global on RN, and
 * document.hidden/visibilitychange becomes AppState — the same "phone locked mid-question"
 * re-arm, which matters more here than it did on the web).
 *
 * 1. Every side effect is driven from a ref, never from inside a setState updater. React
 *    invokes updaters twice in development, which double-graded answers twice before.
 * 2. The graded fact is frozen while the feedback plays. The engine moves on the instant
 *    an answer lands, so reading the live fact showed the answer to a question the child
 *    had not been asked yet.
 */
export function useQuestionLoop({
  fact,
  askedAt,
  limitMs,
  haptics,
  onGrade,
  onAdvance,
}: Options): QuestionLoop {
  const [status, setStatus] = useState<PadStatus>('idle');
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<number[]>([]);
  const [asked, setAsked] = useState<Fact | null>(null);

  const statusRef = useRef<PadStatus>(status);
  statusRef.current = status;
  const pendingRef = useRef<number[]>(pending);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);

  const expectedRef = useRef(0);
  expectedRef.current = fact ? answerDigits(fact).length : 0;
  const factRef = useRef<Fact | null>(fact);
  factRef.current = fact;
  const onGradeRef = useRef(onGrade);
  onGradeRef.current = onGrade;
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;

  useEffect(
    () => () => {
      if (hold.current) clearTimeout(hold.current);
      if (deadline.current) clearTimeout(deadline.current);
    },
    [],
  );

  const setPendingDigits = useCallback((digits: number[]) => {
    pendingRef.current = digits;
    setPending(digits);
  }, []);

  const grade = useCallback((digits: number[]) => {
    if (statusRef.current !== 'idle') return;
    if (!factRef.current) return;
    if (deadline.current) clearTimeout(deadline.current);
    setAsked(factRef.current);
    const { correct } = onGradeRef.current(digits);
    statusRef.current = correct ? 'correct' : 'reveal';
    setStatus(statusRef.current);
    if (correct) tapCorrect(haptics);
    else tapWrong(haptics);
    hold.current = setTimeout(
      () => {
        setStatus('idle');
        statusRef.current = 'idle';
        setAsked(null);
        setPendingDigits([]);
        setAttempt((n) => n + 1);
        onAdvanceRef.current();
      },
      correct ? HOLD_CORRECT_MS : REVEAL_MS,
    );
  }, [haptics, setPendingDigits]);

  const onSlash = useCallback(
    (digits: number[]) => {
      setPendingDigits([]);
      grade(digits);
    },
    [grade, setPendingDigits],
  );

  const onTap = useCallback(
    (digit: number) => {
      if (statusRef.current !== 'idle') return;
      const next = [...pendingRef.current, digit];
      setPendingDigits(next);
      if (next.length >= expectedRef.current) grade(next);
    },
    [grade, setPendingDigits],
  );

  /**
   * The clock measures reaction, not wall time. A phone that locks (or the app is
   * backgrounded) mid-question would otherwise come back to an instant miss, so the
   * question is re-armed on return.
   */
  useEffect(() => {
    const subscription = RNAppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && statusRef.current === 'idle') onAdvanceRef.current();
    });
    return () => subscription.remove();
  }, []);

  // The answer limit, counted from the moment the fact appears. No answer is an answer.
  useEffect(() => {
    if (status !== 'idle' || !askedAt || !fact) return;
    const remaining = Math.max(0, askedAt + limitMs - Date.now());
    deadline.current = setTimeout(() => grade([]), remaining);
    return () => {
      if (deadline.current) clearTimeout(deadline.current);
    };
  }, [askedAt, attempt, fact, grade, limitMs, status]);

  return {
    status,
    displayedFact: (status !== 'idle' && asked) || fact,
    pending,
    attempt,
    onSlash,
    onTap,
  };
}
