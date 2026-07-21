import {
  CATEGORY_COLORS,
  type CategoryColor,
  categoryColorFromName,
  categoryColorName,
} from "@/lib/styles/colors";
import { STORAGE_KEYS, getLocalStorage, setLocalStorage } from "@/lib/local-storage";

/**
 * The owner's container colors in the order recipes take them. Learned from their picks, so the
 * sequence they keep choosing becomes the one they stop having to choose.
 *
 * Local to one browser by design: a color is resolved into the recipe when it joins the batch, not
 * when it is drawn, so a link carries the colors the owner saw rather than the recipient's own.
 *
 * Stored by name — the enum's values are CSS token names, and a rename would strand every sequence.
 */

/**
 * The stored sequence as a full palette ordering: unknown and repeated names are dropped, then the
 * omitted colors appended in palette order. Normalizing lets a stale entry degrade to a usable one.
 */
export function loadColorSequence(): CategoryColor[] {
  const stored: unknown = getLocalStorage(STORAGE_KEYS.makeRecipeColors);
  const seen = new Set<CategoryColor>();
  const sequence: CategoryColor[] = [];

  for (const name of Array.isArray(stored) ? stored : []) {
    const color = categoryColorFromName(name);
    if (color === undefined || seen.has(color)) continue;
    seen.add(color);
    sequence.push(color);
  }
  for (const color of CATEGORY_COLORS) if (!seen.has(color)) sequence.push(color);

  return sequence;
}

/** Position `index` of a full sequence. Throws rather than wrapping: a batch cannot outgrow it. */
function atPosition(sequence: readonly CategoryColor[], index: number): CategoryColor {
  const color = sequence[index];
  if (color === undefined) throw new RangeError(`No color sequence position ${String(index)}`);
  return color;
}

/** The color the `index`-th recipe of a new batch starts with. */
export function colorForPosition(index: number): CategoryColor {
  return atPosition(loadColorSequence(), index);
}

/**
 * Learn that the owner wants `color` at `index`, swapping it with whatever sat there. Swapping
 * rather than overwriting keeps the sequence a permutation, so no color becomes unreachable.
 *
 * Recipes in the batch hold a resolved color, so this recolors none of them; it moves only defaults.
 */
export function recordColorPick(index: number, color: CategoryColor): void {
  const sequence = loadColorSequence();
  sequence[sequence.indexOf(color)] = atPosition(sequence, index);
  sequence[index] = color;
  setLocalStorage(STORAGE_KEYS.makeRecipeColors, sequence.map(categoryColorName));
}
