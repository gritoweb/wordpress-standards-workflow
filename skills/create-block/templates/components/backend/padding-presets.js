/**
 * Global padding presets for all blocks.
 * Edit here to change presets across every block.
 */
export const PADDING_PRESETS = {
  vertical: {
    desktop: [
      { label: 'None', px: 0 },
      { label: 'Medium', px: 112 },
      { label: 'Large', px: 218 },
    ],
    mobile: [
      { label: 'None', px: 0 },
      { label: 'Medium', px: 56 },
      { label: 'Large', px: 96 },
    ],
  },
  /** Horizontal padding (px) applied when the toggle is ON, per breakpoint. */
  horizontal: {
    desktop: 96,
    mobile: 20,
  },
};

// The same responsive classes BlockPadding prints on the page, so the canvas adapts to its own width like the page does.
const PY_MOBILE = { 0: 'py-0', 56: 'py-14', 96: 'py-24', 112: 'py-28' };
const PY_DESKTOP = { 0: 'md:py-0', 56: 'md:py-14', 112: 'md:py-28', 218: 'md:py-[13.625rem]' };
const PX_MOBILE = { false: 'px-0', true: 'px-5' };
const PX_DESKTOP = { false: 'lg:px-0', true: 'lg:px-[6rem]' };

export function editorPaddingClasses(attributes) {
  return [
    PY_MOBILE[attributes.paddingVertMobile ?? 56] ?? 'py-14',
    PY_DESKTOP[attributes.paddingVertDesktop ?? 112] ?? 'md:py-28',
    PX_MOBILE[attributes.paddingXMobile ?? true] ?? 'px-5',
    PX_DESKTOP[attributes.paddingXDesktop ?? true] ?? 'lg:px-[6rem]',
  ].join(' ');
}
