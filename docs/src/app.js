import { findSets, generateBoard, isSet, keyForSet, newRandomSeed } from './engine.js';
import { cardLabel, cardSvg } from './cards.js';
import { getStats, saveSession } from './storage.js';
import { elapsedSeconds, formatTime, hintPenaltySeconds, scoredSeconds, HINT_PENALTY_SECONDS } from './time.js';

const $ = selector => document.querySelector(selector);
const boardElement = $('#board');
const timerElement = $('#timer');
const progressElement = $('#progress');
const messageElement = $('#message');
const foundElement = $('#found-list');
const hintButton = $('#hint-button');
const statsDialog = $('#stats-dialog');
const shareDialog = $('#share-dialog');

let board = [];
let availableSets = [];
let found = new Set();
let selection = [];
let buttonElements = [];
let seed = '';
let hintCount = 0;
let hintLevel = 0;
let hintSet = null;
let startedAt = null;
let elapsed = 0;
let locked = false;
let completed = false;
let frameId = 0;
let feedbackTimeout = 0;
const cardFeedbackTimers = new Map();
const ACTIVE_SESSION_KEY = 'web-set.active.v1';

function nowSeconds() {
  return startedAt === null ? elapsed : elapsedSeconds(startedAt);
}

function renderTimer() {
  // Only one rAF chain may run, including after a synchronous Hint click.
  cancelAnimationFrame(frameId);
  timerElement.textContent = formatTime(scoredSeconds(nowSeconds(), hintCount));
  const penalty = $('#penalty-label');
  penalty.hidden = hintCount === 0;
  penalty.textContent = hintCount ? `+${formatTime(hintPenaltySeconds(hintCount))} за подсказки` : '';
  if (startedAt !== null && !completed) frameId = requestAnimationFrame(renderTimer);
}

function stopTimerOnCompletion() {
  elapsed = nowSeconds();
  startedAt = null;
  cancelAnimationFrame(frameId);
  renderTimer();
}

function persistActiveSession() {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
      seed, startedAt, found: [...found], hintCount
    }));
  } catch {
    // Gameplay remains available without durable browser storage.
  }
}

function clearActiveSession() {
  try { localStorage.removeItem(ACTIVE_SESSION_KEY); } catch {}
}

function message(text, tone = '') {
  messageElement.textContent = text;
  messageElement.dataset.tone = tone;
}

function clearFeedback() {
  window.clearTimeout(feedbackTimeout);
  for (const timeout of cardFeedbackTimers.values()) window.clearTimeout(timeout);
  cardFeedbackTimers.clear();
  locked = false;
  selection = [];
  buttonElements.forEach(button => {
    button.classList.remove('selected', 'correct', 'incorrect', 'already-found');
    button.setAttribute('aria-pressed', 'false');
  });
}

function flashCards(indices, cssClass) {
  const duration = cssClass === 'correct' ? 360 : 380;
  for (const index of indices) {
    const button = buttonElements[index];
    window.clearTimeout(cardFeedbackTimers.get(button));
    button.classList.remove('correct', 'incorrect', 'already-found');
    // Force a new CSS animation when tapping the same card repeatedly.
    void button.offsetWidth;
    button.classList.add(cssClass);
    const timeout = window.setTimeout(() => {
      button.classList.remove(cssClass);
      cardFeedbackTimers.delete(button);
    }, duration);
    cardFeedbackTimers.set(button, timeout);
  }
}

function clearHint() {
  hintLevel = 0;
  hintSet = null;
  hintButton.textContent = `Подсказка (+${HINT_PENALTY_SECONDS} с)`;
  hintButton.disabled = false;
  buttonElements.forEach(button => button.classList.remove('hinted'));
}

function renderProgress() {
  progressElement.textContent = `${found.size} / ${availableSets.length}`;
  $('#progress-bar').style.width = `${100 * found.size / availableSets.length}%`;
}

function renderFound() {
  foundElement.replaceChildren();
  const sidebarList = $('#found-side-list');
  sidebarList.replaceChildren();
  for (const indices of availableSets) {
    if (!found.has(keyForSet(indices))) continue;
    const content = indices.map(i => `<span class="mini-card">${cardSvg(board[i], `mini-${indices.join('-')}`)}</span>`).join('');
    for (const list of [foundElement, sidebarList]) {
      const item = document.createElement('li');
      item.className = 'found-set';
      item.innerHTML = content;
      list.append(item);
    }
  }
  $('#found-count').textContent = String(found.size);
  $('#found-side-count').textContent = String(found.size);
}

function renderBoard() {
  boardElement.replaceChildren();
  buttonElements = board.map((card, index) => {
    const button = document.createElement('button');
    button.className = 'game-card';
    button.type = 'button';
    button.setAttribute('aria-label', `${index + 1}: ${cardLabel(card)}`);
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = cardSvg(card, 'board');
    button.addEventListener('click', () => chooseCard(index));
    boardElement.append(button);
    return button;
  });
}

function chooseCard(index) {
  if (locked || completed) return;
  if (selection.includes(index)) {
    selection = selection.filter(i => i !== index);
    buttonElements[index].classList.remove('selected');
    buttonElements[index].setAttribute('aria-pressed', 'false');
    return;
  }
  selection.push(index);
  buttonElements[index].classList.add('selected');
  buttonElements[index].setAttribute('aria-pressed', 'true');
  if (selection.length !== 3) return;

  const indices = [...selection];
  const key = keyForSet(indices);
  const valid = isSet(...indices.map(i => board[i]));
  const newSet = valid && !found.has(key);
  const cssClass = newSet ? 'correct' : valid ? 'already-found' : 'incorrect';
  // Do not discard taps or charge players for mandatory animation delays.
  selection = [];
  indices.forEach(i => {
    buttonElements[i].classList.remove('selected');
    buttonElements[i].setAttribute('aria-pressed', 'false');
  });
  flashCards(indices, cssClass);

  if (newSet) {
    clearHint();
    found.add(key);
    renderProgress();
    renderFound();
    message(found.size === availableSets.length ? 'Все шесть сетов найдены!' : 'Сет найден', 'success');
  } else {
    message(valid ? 'Этот сет уже найден' : 'Это не сет', 'error');
  }

  if (found.size === availableSets.length) {
    completed = true;
    stopTimerOnCompletion();
    clearActiveSession();
    const rawSeconds = Math.round(elapsed * 10) / 10;
    const persisted = saveSession({ seed, seconds: rawSeconds, hints: hintCount });
    $('#finish-time').textContent = formatTime(scoredSeconds(rawSeconds, hintCount));
    $('#finish-raw-time').textContent = formatTime(rawSeconds);
    $('#finish-penalty-time').textContent = formatTime(hintPenaltySeconds(hintCount));
    $('#finish-hints').textContent = String(hintCount);
    $('#finish-storage').hidden = persisted;
    $('#stats-button').hidden = false;
    // The sixth valid SET ends the round immediately, with no animation delay.
    $('#finish-dialog').showModal();
  } else if (newSet) {
    persistActiveSession();
  }
}

function giveHint() {
  if (completed || locked) return;
  if (hintSet === null || found.has(keyForSet(hintSet))) {
    hintSet = availableSets.find(indices => !found.has(keyForSet(indices)));
    hintLevel = 0;
  }
  if (!hintSet || hintLevel >= 3) return;
  hintCount += 1;
  persistActiveSession();
  // Update immediately rather than waiting for the next animation frame.
  renderTimer();
  hintLevel = Math.min(3, hintLevel + 1);
  buttonElements.forEach(button => button.classList.remove('hinted'));
  hintSet.slice(0, hintLevel).forEach(i => buttonElements[i].classList.add('hinted'));
  if (hintLevel < 3) {
    message(hintLevel === 1
      ? `Одна карта подсвечена · +${HINT_PENALTY_SECONDS} с`
      : `Подсвечены две карты · +${HINT_PENALTY_SECONDS} с`);
    hintButton.textContent = 'Ещё подсказка';
  } else {
    message(`Подсвечен полный сет · +${HINT_PENALTY_SECONDS} с`);
    hintButton.textContent = 'Сет показан';
    hintButton.disabled = true;
  }
}

function reset(seedValue, resumedSession = null) {
  cancelAnimationFrame(frameId);
  clearFeedback();
  clearHint();
  seed = seedValue;
  board = generateBoard(seed);
  availableSets = findSets(board);
  const keys = new Set(availableSets.map(keyForSet));
  found = new Set((resumedSession?.found ?? []).filter(key => keys.has(key)));
  selection = [];
  elapsed = 0;
  hintCount = resumedSession?.hintCount ?? 0;
  startedAt = resumedSession?.startedAt ?? Date.now();
  completed = false;
  locked = false;
  $('#stats-button').hidden = true;
  $('#seed-input').value = seed;
  const url = new URL(location.href);
  url.searchParams.set('seed', seed);
  history.replaceState(null, '', url);
  renderBoard();
  renderProgress();
  renderFound();
  renderTimer();
  persistActiveSession();
  message('Найди все шесть сетов. Время идёт с появления расклада.');
}

function renderStats() {
  const { sessions, best, median } = getStats();
  $('#stat-games').textContent = String(sessions.length);
  $('#stat-best').textContent = best === null ? '—' : formatTime(best);
  $('#stat-median').textContent = median === null ? '—' : formatTime(median);
  const { assistedGames, assistedBest, assistedMedian } = getStats();
  $('#stat-assisted-games').textContent = String(assistedGames);
  $('#stat-assisted-best').textContent = assistedBest === null ? '—' : formatTime(assistedBest);
  $('#stat-assisted-median').textContent = assistedMedian === null ? '—' : formatTime(assistedMedian);
  const recent = $('#recent-games');
  recent.replaceChildren();
  for (const session of [...sessions].reverse().slice(0, 10)) {
    const row = document.createElement('li');
    const when = document.createElement('span');
    when.textContent = new Date(session.recordedAt).toLocaleDateString('ru-RU');
    const result = document.createElement('strong');
    const hints = session.hints ?? 0;
    const finalSeconds = scoredSeconds(session.seconds, hints);
    result.textContent = hints
      ? `${formatTime(finalSeconds)} (чистое ${formatTime(session.seconds)} + ${formatTime(hintPenaltySeconds(hints))}, подсказок: ${hints})`
      : formatTime(session.seconds);
    row.append(when, result);
    recent.append(row);
  }
}

$('#new-button').addEventListener('click', () => reset(newRandomSeed()));
hintButton.addEventListener('click', giveHint);
$('#daily-button').addEventListener('click', () => reset(new Date().toLocaleDateString('sv-SE')));
$('#seed-form').addEventListener('submit', event => {
  event.preventDefault();
  const value = $('#seed-input').value.trim();
  if (value) reset(value.slice(0, 80));
  shareDialog.close();
});
$('#seed-button').addEventListener('click', () => shareDialog.showModal());
$('#stats-button').addEventListener('click', () => {
  if (!completed) return;
  renderStats();
  statsDialog.showModal();
});
$('#finish-stats').addEventListener('click', () => {
  $('#finish-dialog').close();
  renderStats();
  statsDialog.showModal();
});
$('#rules-button').addEventListener('click', () => $('#rules-dialog').showModal());
$('#restart-button').addEventListener('click', () => reset(seed));
$('#finish-new').addEventListener('click', () => { $('#finish-dialog').close(); reset(newRandomSeed()); });
$('#finish-restart').addEventListener('click', () => { $('#finish-dialog').close(); reset(seed); });
$('#copy-button').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    message('Ссылка на расклад скопирована');
    shareDialog.close();
  } catch { message('Не удалось скопировать ссылку — можно скопировать адрес вручную', 'error'); }
});
document.querySelectorAll('dialog [data-close]').forEach(button => {
  button.addEventListener('click', () => button.closest('dialog').close());
});
document.addEventListener('visibilitychange', () => {
  // Wall-clock elapsed time includes background time. Refresh display on return.
  if (!document.hidden && !completed) {
    cancelAnimationFrame(frameId);
    renderTimer();
  }
});

let previousSession = null;
try {
  const state = JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) ?? 'null');
  if (state && typeof state.seed === 'string' && state.seed.length <= 80 &&
      Number.isFinite(state.startedAt) && state.startedAt > 0 &&
      state.startedAt <= Date.now() &&
      Number.isSafeInteger(state.hintCount) && state.hintCount >= 0 &&
      Array.isArray(state.found) && state.found.every(key => typeof key === 'string')) {
    previousSession = state;
  }
} catch {
  // No persisted session: start a fresh board.
}
const requestedSeed = new URL(location.href).searchParams.get('seed');
const initialSeed = requestedSeed && requestedSeed.length <= 80
  ? requestedSeed : previousSession?.seed ?? newRandomSeed();
reset(initialSeed, previousSession?.seed === initialSeed ? previousSession : null);
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
