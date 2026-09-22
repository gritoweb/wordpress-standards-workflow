// field-sizing: content grows the textarea's height to its wrapped content
// (rows=1 is only the starting point); a width class on the caller still
// bounds the width, so long text wraps instead of growing sideways or clipping.
export function AutoGrowingTextarea(props) {
  return (
    <textarea
      {...props}
      rows={1}
      style={{ fieldSizing: 'content', height: 'auto', minHeight: 'auto' }}
    />
  );
}
