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

/*
 * ── Media action over a background photo ────────────────────────────────
 * A frame that fills the block is the right select-or-replace target when
 * the frame is a panel of its own. It is the wrong one when the image is the
 * block's ground, because it covers the whole block and swallows every
 * click, so the block itself can never be selected. There the action is a
 * bounded panel in the corner and the rest of the block stays selectable.
 */
export const BACKGROUND_MEDIA_PANEL =
  'absolute top-4 right-4 z-20 grid h-24 w-36 overflow-hidden rounded-[var(--radius-card)] shadow-md ring-1 ring-[color:var(--color-surface)]/70';

export const clamp = (value, min, max, fallback) => {
  const number = Number(value);

  return Number.isFinite(number) && value !== ''
    ? Math.min(max, Math.max(min, number))
    : fallback;
};

export const emptyLink = () => ({ url: '', opensInNewTab: false });
