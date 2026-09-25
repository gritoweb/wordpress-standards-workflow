/*
 * Shared editor-canvas presentation. Nothing here reaches the front end.
 *
 * ── Type ────────────────────────────────────────────────────────────────
 * The canvas keeps the front end's typeface, weight and tracking, and drops
 * its size. At frontend sizes a section heading is six rems of display type
 * inside a panel a few hundred pixels wide, and because each block mirrored
 * its own heading level, neighbouring blocks landed at wildly different
 * sizes.
 *
 * The Home hero's editor statement is the reference: it already renders at
 * .heading-3, so h3 is the editor's H1 and nothing on the canvas is larger.
 * Each tier below steps down through the same tokens, so one scale runs end
 * to end.
 *
 * Each value overrides font size and line height only. A block keeps its own
 * frontend heading class for everything else, and the utilities layer wins
 * over the components layer those classes live in, so the tier is what
 * renders.
 */
export const EDITOR_TYPE = {
  /** Block statements. The hero reference, and the canvas ceiling. */
  statement:
    'text-[length:var(--text-h3-mobile)] leading-[var(--text-h3-mobile--line-height)] xl:text-[length:var(--text-h3)] xl:leading-[var(--text-h3--line-height)]',

  /** Section headings, one step under a statement. */
  section:
    'text-[length:var(--text-h4-mobile)] leading-[var(--text-h4-mobile--line-height)] xl:text-[length:var(--text-h4)] xl:leading-[var(--text-h4--line-height)]',

  /** Headings for the entries inside a block. */
  entry: 'text-[length:var(--text-h6)] leading-[var(--text-h6--line-height)]',

  /** Eyebrows and subtitles, which mirror display sizes on the front end. */
  supporting:
    'text-[length:var(--text-lead)] leading-[var(--text-lead--line-height)]',

  /*
   * Three quarters of the section tier. A card question set at the section
   * size wrapped badly once the canvas showed three cards side by side, and
   * the cards are narrower in the editor than on the page.
   */
  cardTitle:
    'text-[length:calc(var(--text-h4-mobile)*0.75)] leading-[var(--text-h4-mobile--line-height)] xl:text-[length:calc(var(--text-h4)*0.75)] xl:leading-[var(--text-h4--line-height)]',
};

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

// A plain-string canvas field: wraps and grows instead of clipping; color comes from fieldToneClass().
export const EDITOR_FIELD =
  'm-0 w-full resize-none overflow-hidden border-0 bg-transparent p-1 outline-none focus-visible:ring-2';

// onDark: the field sits on a dark ground or a photo, so it reads light and the ring follows the text.
export function fieldToneClass(onDark) {
  return onDark
    ? 'text-[color:var(--color-light)] placeholder:text-[color:var(--color-light)]/70 focus-visible:ring-current'
    : 'text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink)]/60 focus-visible:ring-[color:var(--color-primary)]';
}

// A repeated field names its position: fieldLabel('Entry heading', 1) is 'Entry heading 2'.
export const fieldLabel = (label, index) => {
  if (!label) return '';

  return index === undefined || index === null
    ? label
    : `${label} ${index + 1}`;
};
