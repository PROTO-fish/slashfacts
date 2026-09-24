/** Short, dry taps. Silently absent on iOS Safari, which has no vibration API. */
export function tapCorrect(enabled: boolean): void {
  if (enabled) navigator.vibrate?.(12);
}

export function tapWrong(enabled: boolean): void {
  if (enabled) navigator.vibrate?.([30, 40, 30]);
}
