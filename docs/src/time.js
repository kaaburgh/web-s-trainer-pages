/** Wall-clock timer and fixed per-hint penalty, kept separate for analytics. */
export const HINT_PENALTY_SECONDS = 15;

export function hintPenaltySeconds(hints) {
  if (!Number.isSafeInteger(hints) || hints < 0) throw new RangeError('hints must be a nonnegative safe integer');
  return hints * HINT_PENALTY_SECONDS;
}

export function scoredSeconds(rawSeconds, hints) {
  return rawSeconds + hintPenaltySeconds(hints);
}

export function elapsedSeconds(startedAt, now = Date.now()) {
  return Math.max(0, (now - startedAt) / 1000);
}

export function formatTime(seconds) {
  const tenths = Math.max(0, Math.round(seconds * 10));
  const minutes = Math.floor(tenths / 600);
  const remainder = tenths % 600;
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(remainder / 10)).padStart(2, '0')}.${remainder % 10}`;
}
