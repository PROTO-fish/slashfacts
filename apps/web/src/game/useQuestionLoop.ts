import { useCallback, useEffect, useRef, useState } from 'react';
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
 * The whole question loop: grade, hold the feedback,
 * advance. Two things in here were learned the hard way and must not be undone.
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
  // Authoritative copy of the tapped digits: updaters stay pure, grading is a side effect.
  const pendingRef = useRef<number[]>(pending);
  const hold = useRef<number | null>(null);
  const deadline = useRef<number | null>(null);

  // Only the length is used, never the value: how many digits this answer needs.
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
      if (hold.current) window.clearTimeout(hold.current);
      if (deadline.current) window.clearTimeout(deadline.current);
    },
    [],
  );

  const setPendingDigits = useCallback((digits: number[]) => {
    pendingRef.current = digits;
    setPending(digits);
  }, []);

  /**
   * Grade one answer. An empty list means the clock ran out. Either way the question is
   * over: right answers flash, missed ones show the answer, and the round moves on.
   */
  const grade = useCallback((digits: number[]) => {
    if (statusRef.current !== 'idle') return;
    if (!factRef.current) return;
    if (deadline.current) window.clearTimeout(deadline.current);
    setAsked(factRef.current);
    const { correct } = onGradeRef.current(digits);
    statusRef.current = correct ? 'correct' : 'reveal';
    setStatus(statusRef.current);
    if (correct) tapCorrect(haptics);
    else tapWrong(haptics);
    hold.current = window.setTimeout(
      () => {
        setStatus('idle');
        statusRef.current = 'idle';
        setAsked(null);
        setPendingDigits([]);
        setAttempt((n) => n + 1);
        // The next question goes up now, so its clock starts now.
        onAdvanceRef.current();
      },
      correct ? HOLD_CORRECT_MS : REVEAL_MS,
    );
  }, [haptics, setPendingDigits]);

  /** A slash carries the whole answer, so it replaces anything tapped so far. */
  const onSlash = useCallback(
    (digits: number[]) => {
      setPendingDigits([]);
      grade(digits);
    },
    [grade, setPendingDigits],
  );

  /** Taps accumulate until the answer is as long as this fact needs, then grade. */
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
   * The clock measures reaction, not wall time. A phone that locks mid-question would
   * otherwise come back to an instant miss, so the question is re-armed on return.
   */
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && statusRef.current === 'idle') onAdvanceRef.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // The answer limit, counted from the moment the fact appears. No answer is an answer.
  useEffect(() => {
    if (status !== 'idle' || !askedAt || !fact) return;
    const remaining = Math.max(0, askedAt + limitMs - Date.now());
    deadline.current = window.setTimeout(() => grade([]), remaining);
    return () => {
      if (deadline.current) window.clearTimeout(deadline.current);
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
