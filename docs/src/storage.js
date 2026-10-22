const STORAGE_KEY = 'web-set.sessions.v1';
const MAX_SESSIONS = 250;
import { hintPenaltySeconds, scoredSeconds } from './time.js';

function readSessions() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter(item => Number.isFinite(item.seconds)) : [];
  } catch {
    return [];
  }
}

export function getStats() {
  const sessions = readSessions();
  // Ranking uses scored time; each saved entry retains raw time separately.
  // Older saved entries lacking explicit penalty fields remain readable.
  function summarize(items) {
    const score = item => scoredSeconds(item.seconds, item.hints ?? 0);
    const best = items.length ? Math.min(...items.map(score)) : null;
    const recent = items.slice(-10).map(score).sort((a, b) => a - b);
    const middle = Math.floor(recent.length / 2);
    const median = recent.length
      ? (recent.length % 2 ? recent[middle] : (recent[middle - 1] + recent[middle]) / 2)
      : null;
    return { best, median };
  }
  const unaided = sessions.filter(item => (item.hints ?? 0) === 0);
  const assisted = sessions.filter(item => (item.hints ?? 0) > 0);
  const { best, median } = summarize(unaided);
  const { best: assistedBest, median: assistedMedian } = summarize(assisted);
  return { sessions, best, median, assistedGames: assisted.length, assistedBest, assistedMedian };
}

export function saveSession(session) {
  try {
    const sessions = readSessions();
    const hints = session.hints ?? 0;
    if (!Number.isFinite(session.seconds) || session.seconds < 0) return false;
    const penaltySeconds = hintPenaltySeconds(hints);
    sessions.push({
      ...session,
      hints,
      penaltySeconds,
      adjustedSeconds: scoredSeconds(session.seconds, hints),
      recordedAt: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-MAX_SESSIONS)));
    return true;
  } catch {
    // PWA works when storage is unavailable (for example, private browsing).
    return false;
  }
}
