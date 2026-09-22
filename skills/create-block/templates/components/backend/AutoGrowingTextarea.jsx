/**
 * Auto-growing textarea for inline Gutenberg canvas text editing.
 *
 * Eliminates scrollbars and grab handles completely, dynamically adjusting
 * height to content so headings and body copy look identical to the front end.
 * Normalizes `onChange` to always pass the string value (`event.target.value`),
 * preventing React SyntheticEvent serialization crashes in block attributes.
 */
export function AutoGrowingTextarea({
  value,
  onChange,
  className = '',
  style = {},
  rows = 1,
  ...props
}) {
  const handleChange = (event) => {
    if (onChange) {
      // Pass raw string to prevent SyntheticEvent crashing block attributes
      onChange(event.target.value);
    }
  };

  return (
    <textarea
      value={value ?? ''}
      onChange={handleChange}
      rows={rows}
      className={`resize-none overflow-hidden outline-none ${className}`}
      style={{
        fieldSizing: 'content',
        resize: 'none',
        overflow: 'hidden',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        ...style,
      }}
      {...props}
    />
  );
}
