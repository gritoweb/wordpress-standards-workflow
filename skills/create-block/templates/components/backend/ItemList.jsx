import { Button } from '@wordpress/components';
import { useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * List editor for an array attribute.
 *
 * Every row is visible at once and identifies itself — a thumbnail where the
 * item has an image, its own name where it has one. Selecting a row opens it
 * in the edit form below the list.
 *
 * REORDERING IS TWO PATHS TO THE SAME MOVE, and both are deliberate.
 *
 *   1. A drag handle. Chris, 2026-08-26: "it's a list, and you drag and drop
 *      them vertically with a little grabby thing." The handle is the only
 *      draggable surface, so dragging never swallows text selection and the
 *      row's own buttons stay reliable.
 *
 *      POINTER EVENTS, NOT HTML5 DRAG AND DROP, and that is deliberate twice
 *      over. First, `draggable` + dragstart/dragover/drop could not be VERIFIED
 *      here: a synthetic drag does not initiate a native HTML5 drag, so the
 *      only evidence available would have been reading the code — measured on
 *      2026-08-26, a full-distance synthetic drag moved nothing. Second, HTML5
 *      drag inside the block editor competes with Gutenberg's own block
 *      dragging, which listens on the same events. A pointer drag is driven by
 *      ordinary mousedown/mousemove/mouseup, so it is testable and it cannot be
 *      hijacked. No library either way.
 *
 *   2. The up and down arrows, kept. They are the keyboard path, they work
 *      where a drag target would be a few pixels tall in a narrow sidebar, and
 *      they are what a screen reader announces. A drag handle alone would make
 *      reordering mouse-only, which is why the arrows were chosen first.
 *
 * Either path keeps the moved row selected, so a run of moves acts on the same
 * item.
 *
 * LAYOUT IS INLINE STYLE, NOT TAILWIND, AND THAT IS NOT A STYLE PREFERENCE.
 * This control now renders in two different documents. Inside a block's canvas
 * preview it gets `editor.css`, where the Tailwind utilities exist; inside
 * InspectorControls it renders in the ADMIN document, which loads no theme CSS
 * at all — measured: `.flex` is not defined there, so a row collapsed to
 * `display: block` and a 48px thumbnail painted at its intrinsic 150px. Inline
 * styles are the only declarations that hold in both places.
 *
 * @param {object}   props
 * @param {Array}    props.items           The array attribute.
 * @param {number}   props.activeItem      Index currently open in the form below.
 * @param {Function} props.setActiveItem   Setter for that index.
 * @param {Function} [props.onAdd]         Append an item. Omit to hide the button.
 * @param {Function} props.onRemove        Remove the item at an index.
 * @param {Function} props.onMove          Move an item: (from, to).
 * @param {Function} [props.getLabel]      Row label from (item, index).
 * @param {Function} [props.getMeta]       Secondary line from (item, index).
 * @param {Function} [props.getThumb]      Thumbnail URL from (item).
 * @param {boolean}  [props.selectable]    False renders the label as plain text.
 * @param {number}   [props.minItems]      Remove is disabled at this count.
 * @param {string}   [props.addButtonLabel]
 * @param {string}   [props.itemLabelPrefix]
 * @param {string}   [props.removeConfirm] Null skips the confirm.
 */

const S = {
  list: { margin: '0 0 12px', padding: 0, listStyle: 'none' },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 6px',
    marginBottom: '4px',
    border: '1px solid #e0e0e0',
    borderRadius: '3px',
    background: '#fff',
    boxSizing: 'border-box',
  },
  rowActive: { borderColor: '#1e1e1e', background: 'rgba(30,30,30,0.04)' },
  rowDragging: { opacity: 0.4 },
  /*
   * THE DROP INDICATOR SITS ON THE EDGE THE ITEM WILL ACTUALLY LAND ON.
   *
   * `move(from, to)` splices the dragged item OUT first and then inserts it at
   * `to`, so the item ends up at index `to` in the FINAL list. Dragging row 0
   * onto row 2 of [A,B,C,D] gives [B,C,A,D] — A lands BELOW C, not above it.
   * A fixed top border therefore told the truth on upward drags and lied on
   * every downward one.
   *
   * Drawn with an inset box-shadow rather than a border: a box-shadow never
   * takes part in layout, so the indicator cannot nudge the rows the pointer is
   * being measured against. The 2px border it replaces grew the row by 1px over
   * its resting 1px border.
   */
  rowOverAbove: { boxShadow: 'inset 0 2px 0 #1e1e1e' },
  rowOverBelow: { boxShadow: 'inset 0 -2px 0 #1e1e1e' },
  handle: {
    flex: 'none',
    padding: '0 2px',
    fontSize: '14px',
    lineHeight: 1,
    color: '#949494',
    cursor: 'grab',
    userSelect: 'none',
  },
  thumb: {
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    overflow: 'hidden',
    border: '1px solid #e0e0e0',
    borderRadius: '2px',
    background: '#f6f7f7',
  },
  thumbImg: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
  thumbEmpty: { fontSize: '10px', color: '#ccc' },
  labelWrap: {
    minWidth: 0,
    flex: '1 1 auto',
    padding: 0,
    border: 0,
    background: 'none',
    textAlign: 'left',
    font: 'inherit',
    fontSize: '13px',
    color: '#1e1e1e',
    cursor: 'pointer',
  },
  labelWrapStatic: {
    minWidth: 0,
    flex: '1 1 auto',
    fontSize: '13px',
    color: '#1e1e1e',
  },
  // Up to two lines before an ellipsis, so a row's own name reads in full
  // instead of clipping "Jacqueline Baik" to "Jacquel…". `-webkit-line-clamp`
  // is the only multi-line-then-ellipsis rule that exists; every row renders
  // in Chrome, so its `-webkit-box` support is universal here, not a
  // progressive-enhancement gamble. `wordBreak`/`overflowWrap` stay 'normal'
  // so the wrap lands between words ("Jacqueline Baik"), not mid-word
  // ("Jacqueli-ne Baik").
  truncate: {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'normal',
    overflowWrap: 'normal',
  },
  meta: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '11px',
    color: '#949494',
  },
  actions: { flex: 'none', display: 'flex', alignItems: 'center', gap: '0' },
  btn: {
    padding: '2px 4px',
    border: 0,
    borderRadius: '2px',
    background: 'none',
    fontSize: '11px',
    lineHeight: 1,
    color: '#757575',
    cursor: 'pointer',
  },
  btnDisabled: { color: '#ddd', cursor: 'default' },
  btnRemove: { color: '#949494' },
};

export function ItemList({
  items,
  activeItem,
  setActiveItem,
  onAdd,
  onRemove,
  onMove,
  getLabel,
  getMeta,
  getThumb,
  selectable = true,
  minItems = 1,
  addButtonLabel = __('+ Add item', '__TEXT_DOMAIN__'),
  itemLabelPrefix = __('Item', '__TEXT_DOMAIN__'),
  removeConfirm = __('Remove this item?', '__TEXT_DOMAIN__'),
}) {
  // `dragging` is the row in flight; `over` is where it would land.
  const [dragging, setDragging] = useState(null);
  const [over, setOver] = useState(null);
  const listRef = useRef(null);
  // `over` inside the drag handlers would be the value captured at mousedown —
  // a stale closure. The ref is what the handlers read.
  const overRef = useRef(null);

  const label = (item, index) => {
    const own = getLabel ? getLabel(item, index) : '';
    return own && String(own).trim()
      ? String(own).trim()
      : `${itemLabelPrefix} ${index + 1}`;
  };

  const move = (from, to) => {
    if (to < 0 || to >= items.length || from === to) return;
    onMove(from, to);
    // Follow the row so repeated moves keep acting on the same item.
    if (setActiveItem) setActiveItem(to);
  };

  // Which row is under this Y, read from the rows' own boxes rather than from
  // a fixed row height — a row grows when its label wraps to a second line.
  const indexAt = (clientY) => {
    const list = listRef.current;
    if (!list) return null;
    const rows = [...list.children];
    for (let i = 0; i < rows.length; i++) {
      if (clientY < rows[i].getBoundingClientRect().bottom) return i;
    }
    return rows.length - 1;
  };

  const startDrag = (index, event) => {
    if (event.button !== undefined && event.button !== 0) return;
    // Stop the sidebar selecting text under the pointer for the whole drag.
    event.preventDefault();
    setDragging(index);
    setOver(index);
    overRef.current = index;

    /*
     * LISTEN ON THE LIST'S OWN DOCUMENT, NOT `document`.
     *
     * This component renders into two different documents from the same realm.
     * In the block sidebar its nodes live in the admin document, so bare
     * `document` is right. In a block's canvas preview its nodes live inside
     * the editor-canvas IFRAME while the closure's `document` still points at
     * the admin document — measured: mousedown reached the handle, and not one
     * mousemove reached the listener, so a drag in the logo wall did nothing.
     * The row's ownerDocument is whichever one the pointer is actually in.
     *
     * The top document is added as well, so releasing the button outside the
     * iframe still ends the drag instead of leaving the row stuck to the mouse.
     */
    const rowDoc = listRef.current
      ? listRef.current.ownerDocument
      : event.target.ownerDocument;
    const docs = rowDoc === document ? [rowDoc] : [rowDoc, document];

    const stop = () => {
      docs.forEach((doc) => {
        doc.removeEventListener('mousemove', onMove);
        doc.removeEventListener('mouseup', onUp);
      });
      document.removeEventListener('mouseout', onLeave);
      setDragging(null);
      setOver(null);
    };
    // A release outside the browser window is never delivered, so a move with
    // no button held, or the pointer leaving the window, cancels the drag.
    const onLeave = (e) => {
      if (!e.relatedTarget) stop();
    };

    const onMove = (e) => {
      if (e.buttons === 0) {
        stop();
        return;
      }

      /*
       * SAME GUARD AS onUp, AND FOR THE SAME REASON. indexAt compares clientY
       * against rects measured inside the canvas iframe. A mousemove delivered
       * to the TOP document while the pointer is outside the iframe carries a
       * clientY in a different coordinate space, so it resolved to a wrong row
       * and left overRef holding it — which onUp then uses as its fallback when
       * the button is released outside the iframe. The top document stays
       * listening so the drag still ENDS out there; it just no longer steers.
       */
      if (e.target && e.target.ownerDocument !== rowDoc) {
        return;
      }

      const at = indexAt(e.clientY);
      if (at !== null) {
        overRef.current = at;
        setOver(at);
      }
    };
    const onUp = (e) => {
      // A release in the other document carries no useful Y for this list.
      const at =
        e.target && e.target.ownerDocument === rowDoc
          ? indexAt(e.clientY)
          : overRef.current;
      stop();
      if (at !== null) move(index, at);
    };
    docs.forEach((doc) => {
      doc.addEventListener('mousemove', onMove);
      doc.addEventListener('mouseup', onUp);
    });
    document.addEventListener('mouseout', onLeave);
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <ol ref={listRef} style={S.list}>
        {items.map((item, index) => {
          const thumb = getThumb ? getThumb(item) : null;
          const meta = getMeta ? getMeta(item, index) : null;
          const isActive = selectable && activeItem === index;
          const isDragging = dragging === index;
          const isOver = over === index && dragging !== null && !isDragging;
          // Below when the item is travelling down the list, above otherwise —
          // see the rowOverAbove / rowOverBelow comment.
          const dropsBelow = isOver && over > dragging;
          const first = index === 0;
          const last = index === items.length - 1;
          const canRemove = items.length > minItems;

          return (
            <li key={item && item.key ? item.key : index}>
              <div
                data-ws-row={index}
                style={{
                  ...S.row,
                  ...(isActive ? S.rowActive : null),
                  ...(isDragging ? S.rowDragging : null),
                  ...(isOver
                    ? dropsBelow
                      ? S.rowOverBelow
                      : S.rowOverAbove
                    : null),
                }}
              >
                <span
                  aria-hidden="true"
                  title={__('Drag to reorder', '__TEXT_DOMAIN__')}
                  data-ws-drag-handle
                  onMouseDown={(e) => startDrag(index, e)}
                  style={{
                    ...S.handle,
                    cursor: dragging === index ? 'grabbing' : 'grab',
                  }}
                >
                  ⠿
                </span>

                <span style={S.thumb}>
                  {thumb ? (
                    <img src={thumb} alt="" style={S.thumbImg} />
                  ) : (
                    <span style={S.thumbEmpty}>—</span>
                  )}
                </span>

                {selectable ? (
                  <button
                    type="button"
                    onClick={() => setActiveItem(index)}
                    style={S.labelWrap}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span style={S.truncate} title={label(item, index)}>
                      {label(item, index)}
                    </span>
                    {meta && <span style={S.meta}>{meta}</span>}
                  </button>
                ) : (
                  <span style={S.labelWrapStatic}>
                    <span style={S.truncate} title={label(item, index)}>
                      {label(item, index)}
                    </span>
                    {meta && <span style={S.meta}>{meta}</span>}
                  </span>
                )}

                <span style={S.actions}>
                  <button
                    type="button"
                    onClick={() => move(index, index - 1)}
                    disabled={first}
                    aria-label={`${__('Move up', '__TEXT_DOMAIN__')}: ${label(item, index)}`}
                    style={{ ...S.btn, ...(first ? S.btnDisabled : null) }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, index + 1)}
                    disabled={last}
                    aria-label={`${__('Move down', '__TEXT_DOMAIN__')}: ${label(item, index)}`}
                    style={{ ...S.btn, ...(last ? S.btnDisabled : null) }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!removeConfirm || window.confirm(removeConfirm)) {
                        onRemove(index);
                      }
                    }}
                    disabled={!canRemove}
                    aria-label={`${__('Remove', '__TEXT_DOMAIN__')}: ${label(item, index)}`}
                    style={{
                      ...S.btn,
                      ...S.btnRemove,
                      ...(canRemove ? null : S.btnDisabled),
                    }}
                  >
                    ✕
                  </button>
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {onAdd && (
        <Button variant="secondary" onClick={onAdd}>
          {addButtonLabel}
        </Button>
      )}
    </div>
  );
}
