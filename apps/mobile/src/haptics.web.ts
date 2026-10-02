/**
 * Web build of haptics.ts: the same two patterns the previous web app used. expo-haptics
 * does nothing in a browser, while navigator.vibrate works on Android browsers (and is
 * silently absent on iOS Safari, which has no vibration API).
 */
export function tapCorrect(enabled: boolean): void {
  if (enabled) navigator.vibrate?.(12);
}

export function tapWrong(enabled: boolean): void {
  if (enabled) navigator.vibrate?.([30, 40, 30]);
}
