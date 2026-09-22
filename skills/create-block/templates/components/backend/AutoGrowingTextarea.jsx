import { useEffect, useRef } from '@wordpress/element';

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
  const textareaRef = useRef(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    resize();
  }, [value]);

  const handleChange = (event) => {
    if (onChange) {
      // Pass raw string to prevent SyntheticEvent crashing block attributes
      onChange(event.target.value);
    }
    resize();
  };

  return (
    <textarea
      ref={textareaRef}
      value={value ?? ''}
      onChange={handleChange}
      onInput={resize}
      rows={rows}
      className={`resize-none overflow-hidden outline-none ${className}`}
      style={{
        fieldSizing: 'content',
        height: 'auto',
        minHeight: 'auto',
        overflow: 'hidden',
        resize: 'none',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        display: 'block',
        ...style,
      }}
      {...props}
    />
  );
}
