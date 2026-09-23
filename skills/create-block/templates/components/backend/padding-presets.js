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

// Canvas preview of the Spacing panel at desktop values — the same numbers BlockPadding prints.
export function editorPaddingStyle(attributes) {
  const vertical = attributes.paddingVertDesktop ?? 112;
  const side = (attributes.paddingXDesktop ?? true) ? PADDING_PRESETS.horizontal.desktop : 0;

  return {
    paddingTop: `${vertical}px`,
    paddingBottom: `${vertical}px`,
    paddingLeft: `${side}px`,
    paddingRight: `${side}px`,
  };
}
