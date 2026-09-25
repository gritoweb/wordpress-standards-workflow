import { useState } from "@wordpress/element";
import { moveItem } from "./moveItem.js";

// React key for a repeater row (REP-6). The editor never saves an id of its
// own into an item, so an item without a saved `key` falls back to its index.
export const itemKey = (entry, index) => entry.key || index;

/**
 * The state every repeater rewrites (REP-4, REP-5): add, update, move, remove
 * and the active row. The active row follows the item: after a move it is the
 * moved item, after an add the new one, after a removal the nearest survivor.
 * An update keeps every key the item already has.
 *
 * @param {object}   options
 * @param {Array}    options.items     The saved array (anything else reads as empty).
 * @param {Function} options.setItems  Receives the next array; usually
 *                                     `(items) => setAttributes({ items })`.
 * @param {Function} options.blank     Returns a new row. Defaults to `{}`.
 */
export function useRepeater({ items, setItems, blank = () => ({}) }) {
  const list = Array.isArray(items) ? items : [];
  const [active, setActive] = useState(0);
  const activeIndex = Math.min(active, Math.max(list.length - 1, 0));

  return {
    items: list,
    active: activeIndex,
    activeItem: list[activeIndex],
    setActive,
    add() {
      setItems([...list, blank()]);
      setActive(list.length);
    },
    update(index, patch) {
      setItems(
        list.map((entry, current) =>
          current === index ? { ...entry, ...patch } : entry,
        ),
      );
    },
    move(from, to) {
      setItems(moveItem(list, from, to));
      setActive(to);
    },
    remove(index) {
      const next = list.filter((_entry, current) => current !== index);
      setItems(next);
      setActive(next.length ? Math.min(index, next.length - 1) : 0);
    },
  };
}
