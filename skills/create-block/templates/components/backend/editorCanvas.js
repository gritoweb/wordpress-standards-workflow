/*
 * Shared editor-canvas presentation. Nothing here reaches the front end.
 * The canvas uses the same type classes as the page; it never scales them.
 */
export const clamp = (value, min, max, fallback) => {
  const number = Number(value);

  return Number.isFinite(number) && value !== ''
    ? Math.min(max, Math.max(min, number))
    : fallback;
};

export const emptyLink = () => ({ url: '', opensInNewTab: false });

/**
 * Canonical dashed editor boundary for blocks on the canvas.
 * Ported directly from the White Summers pattern:
 * - 1px dashed outline inset by 1px with 30% ink opacity
 * - Rounded card radius (rounded-[var(--radius-card,1rem)])
 * - Containment with overflow-hidden
 * - Spacing between sibling blocks (mb-10)
 */
export const EDITOR_BLOCK_FRAME =
  'mb-10 overflow-hidden rounded-[var(--radius-card,1rem)] outline outline-1 outline-offset-[-1px] outline-dashed outline-[color:var(--color-ink,#000)]/30';

