/**
 * Each card is a four-trit base-3 integer (0..80):
 * [count, color, shape, fill]. For a SET every attribute is either
 * equal on all three cards or different on all three cards.
 */
export const DECK_SIZE = 81;
export const BOARD_SIZE = 12;
export const TARGET_SETS = 6;

export function attributes(card) {
  if (!Number.isInteger(card) || card < 0 || card >= DECK_SIZE) {
    throw new RangeError('Card must be an integer between 0 and 80');
  }
  const result = [];
  for (let i = 0; i < 4; i += 1) {
    result.push(card % 3);
    card = Math.floor(card / 3);
  }
  return result;
}

export function thirdCard(a, b) {
  const left = attributes(a);
  const right = attributes(b);
  let factor = 1;
  let result = 0;
  for (let i = 0; i < 4; i += 1) {
    result += ((6 - left[i] - right[i]) % 3) * factor;
    factor *= 3;
  }
  return result;
}

export function isSet(a, b, c) {
  if (new Set([a, b, c]).size !== 3) return false;
  return thirdCard(a, b) === c;
}

/** Return all unique index triples in stable order. */
export function findSets(board) {
  if (new Set(board).size !== board.length) {
    throw new Error('Board contains duplicate cards');
  }
  const indices = new Map(board.map((card, index) => [card, index]));
  const sets = [];
  for (let i = 0; i < board.length; i += 1) {
    for (let j = i + 1; j < board.length; j += 1) {
      const k = indices.get(thirdCard(board[i], board[j]));
      if (k !== undefined && k > j) sets.push([i, j, k]);
    }
  }
  return sets;
}

/** Deterministic UTF-16 string hash. The same seed always produces the same board. */
export function seedToUint32(seed) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomGenerator(seed) {
  let state = seedToUint32(String(seed));
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rejection sampling: unbiased shuffle of 12 from all 81 cards. */
export function generateBoard(seed, targetSets = TARGET_SETS) {
  if (!Number.isInteger(targetSets) || targetSets < 0) {
    throw new RangeError('targetSets must be a nonnegative integer');
  }
  const random = randomGenerator(seed);
  for (let attempt = 0; attempt < 100000; attempt += 1) {
    const deck = Array.from({ length: DECK_SIZE }, (_, index) => index);
    for (let i = 0; i < BOARD_SIZE; i += 1) {
      const j = i + Math.floor(random() * (DECK_SIZE - i));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const board = deck.slice(0, BOARD_SIZE);
    if (findSets(board).length === targetSets) return board;
  }
  throw new Error(`Failed to generate a board containing ${targetSets} sets`);
}

export function keyForSet(indices) {
  return [...indices].sort((a, b) => a - b).join('-');
}

export function newRandomSeed() {
  const random = new Uint32Array(2);
  globalThis.crypto.getRandomValues(random);
  return [...random].map(value => value.toString(36)).join('-');
}
