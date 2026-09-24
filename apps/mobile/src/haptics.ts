import * as Haptics from 'expo-haptics';

/**
 * Native equivalents of apps/web/src/haptics.ts's two vibration patterns — a short dry tap
 * for correct, a buzzier signal for wrong. expo-haptics has no custom-pattern API (no
 * counterpart to navigator.vibrate([30, 40, 30])), so wrong maps to the platform's own
 * "error" feedback rather than approximating the pattern by hand. Unlike the web version,
 * this actually fires on iPhone — the one thing this port exists to fix.
 */
export function tapCorrect(enabled: boolean): void {
  if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function tapWrong(enabled: boolean): void {
  if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
