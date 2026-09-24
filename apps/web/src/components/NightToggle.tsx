/**
 * A disc, half inked. It is the whole idea of the mode in one shape — the two colours of
 * the app meeting on a straight edge — and it stays legible at 16px in either palette,
 * which a crescent moon does not. Drawn, not a glyph: no font has to cooperate.
 */
export function NightToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      className="night"
      aria-pressed={on}
      aria-label="Night mode"
      title="Night mode"
      onClick={onToggle}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {/* The filled half flips with the mode, so the button shows the palette it offers. */}
        <circle cx="12" cy="12" r="9.5" />
        <path d={on ? 'M 12 2.5 A 9.5 9.5 0 0 0 12 21.5 Z' : 'M 12 2.5 A 9.5 9.5 0 0 1 12 21.5 Z'} />
      </svg>
    </button>
  );
}
