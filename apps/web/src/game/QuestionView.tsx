import { product, type Fact } from '@slash/core';
import { SlashPad, type PadStatus } from '../slash/SlashPad.js';

/** Above this many questions the ticks become a grey smear, so only the counter shows. */
const TICK_LIMIT = 12;

interface Props {
  fact: Fact;
  status: PadStatus;
  pending: readonly number[];
  attempt: number;
  /** 0-based position in the run, and its length. */
  index: number;
  total: number;
  /** This mode's answer limit, which drives the clock animation. */
  limitMs: number;
  /** Restamped every time a question goes up, so the clock animation restarts. */
  askedAt: number;
  onSlash: (digits: number[]) => void;
  onTap: (digit: number) => void;
}

/**
 * One question on screen: counter, clock, prompt, pad. Identical in practice and in the
 * mode — only the source of questions and the limit differ, so there is one of these.
 */
export function QuestionView({
  fact,
  status,
  pending,
  attempt,
  index,
  total,
  limitMs,
  askedAt,
  onSlash,
  onTap,
}: Props) {
  const revealing = status === 'reveal';

  return (
    <div className="practice-main">
      <div className="meta">
        <span>
          Q {index + 1} / {total}
        </span>
        {/* A tick row stops being readable long before a very long run ends. */}
        {total <= TICK_LIMIT && (
          <span className="ticks">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`tick${i < index ? ' on' : ''}`} />
            ))}
          </span>
        )}
      </div>

      {/* Restarted by its key on every question, and frozen while feedback plays. */}
      <div className="clock" aria-hidden="true">
        <span
          key={`${index}:${attempt}:${askedAt}`}
          className={`clock-fill${status === 'idle' ? ' running' : ' stopped'}`}
          style={{ animationDuration: `${limitMs}ms` }}
        />
      </div>

      <div className="stage">
        <h2 className="prompt" aria-label={`${fact.a} times ${fact.b}`}>
          <span>{fact.a}</span>
          {/*
            Drawn, not a glyph — the same reasoning as the back arrow and the night toggle.
            A × from the font hangs off a baseline inside a line box of its own, so it sat
            low on the web and landed somewhere different again on each native platform.
            A path has no baseline: centring the box centres the mark.
          */}
          <svg className="times" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 5 L19 19 M19 5 L5 19" />
          </svg>
          <span>{fact.b}</span>
        </h2>

        {/* The pad keeps its place so nothing shifts; the answer covers it. */}
        <div className={`pad-slot${revealing ? ' revealing' : ''}`}>
          <SlashPad
            status={status}
            onSlash={onSlash}
            onTap={onTap}
            pending={pending}
            resetKey={String(attempt)}
          />
          {revealing && <div className="reveal-number">{product(fact)}</div>}
        </div>
      </div>
    </div>
  );
}
