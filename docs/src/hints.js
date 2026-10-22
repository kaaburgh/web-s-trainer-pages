import { keyForSet } from './engine.js';

/**
 * Find the next card to select for a hint.
 * Prefer a not-yet-found set compatible with the player's current selection,
 * and continue the same hinted set while it remains compatible.
 * If the selected cards cannot form an unfound set, clear the incompatible
 * selection before selecting a card; never charge for a no-op.
 */
export function chooseHintMove(sets, foundKeys, selection, preferredSet = null) {
  const missing = sets.filter(indices => !foundKeys.has(keyForSet(indices)));
  if (!missing.length) return null;

  const compatible = indices => selection.every(index => indices.includes(index));
  let target = preferredSet
    ? missing.find(indices => keyForSet(indices) === keyForSet(preferredSet) && compatible(indices))
    : null;
  if (!target) target = missing.find(compatible);
  const clearSelection = !target;
  if (!target) target = missing[0];

  const selected = clearSelection ? [] : selection;
  const index = target.find(i => !selected.includes(i));
  if (index === undefined) return null;
  return { set: target, index, clearSelection };
}
