import { attributes } from './engine.js';

const COLORS = ['#e33d4e', '#239b66', '#7356bc'];
const COLOR_NAMES = ['красные', 'зелёные', 'фиолетовые'];
const SHAPES = [
  'M-15 -26 C-15 -35 -9 -38 0 -38 C9 -38 15 -35 15 -26 V26 C15 35 9 38 0 38 C-9 38 -15 35 -15 26 Z',
  'M0 -39 L19 0 L0 39 L-19 0 Z',
  'M-17 -33 C-6 -42 12 -39 15 -29 C20 -16 3 -5 4 7 C4 18 19 26 14 35 C7 43 -10 39 -17 33 C-23 23 -11 12 -9 3 C-5 -9 -22 -22 -17 -33 Z'
];
const SHAPE_NAMES = ['овала', 'ромба', 'волны'];
const FILL_NAMES = ['пустых', 'полосатых', 'закрашенных'];

export function cardLabel(card) {
  const [count, color, shape, fill] = attributes(card);
  return `${count + 1} ${COLOR_NAMES[color]} ${FILL_NAMES[fill]} ${SHAPE_NAMES[shape]}`;
}

/** Generate vector artwork locally: no downloaded images or external fonts. */
export function cardSvg(card, suffix = 'board') {
  const [count, color, shape, fill] = attributes(card);
  const positions = count === 0 ? [80] : count === 1 ? [52, 108] : [28, 80, 132];
  const ink = COLORS[color];
  const patternId = `stripes-${suffix}-${card}`;
  const fillPaint = fill === 0 ? '#ffffff' : fill === 1 ? `url(#${patternId})` : ink;
  const symbols = positions.map(x =>
    `<path d="${SHAPES[shape]}" transform="translate(${x},55)" fill="${fillPaint}" stroke="${ink}" stroke-width="2.9" stroke-linejoin="round"/>`
  ).join('');
  return `<svg class="card-art" viewBox="0 0 160 110" aria-hidden="true" focusable="false">
    <defs><pattern id="${patternId}" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 1 H8" stroke="${ink}" stroke-width="2"/></pattern></defs>
    ${symbols}
  </svg>`;
}
