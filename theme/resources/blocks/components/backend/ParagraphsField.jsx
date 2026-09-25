import {
  RichText,
  store as blockEditorStore,
  useBlockEditContext,
} from '@wordpress/block-editor';
import { useDispatch, useSelect } from '@wordpress/data';
import { RawHTML, useId } from '@wordpress/element';
import { create, split, toHTMLString } from '@wordpress/rich-text';

const PARAGRAPH = /(<p(?:\s[^>]*)?>)([\s\S]*?)<\/p>/gi;
const HAS_PARAGRAPH = /<p[\s>]/i;
const STRONG_ONLY = /^\s*<strong>[\s\S]*<\/strong>\s*$/i;

// Splits a value into paragraphs, which are editable, and raw segments, which
// are everything else (lists, headings, comments, whitespace) and serialize
// back untouched. A paragraph keeps its own opening tag and attributes.
// A value without `<p>` is one bare paragraph.
export function parseParagraphs(html) {
  const value = html || '';
  if (!HAS_PARAGRAPH.test(value)) {
    return [{ open: '', html: value }];
  }

  const segments = [];
  let last = 0;
  for (const match of value.matchAll(PARAGRAPH)) {
    if (match.index > last) {
      segments.push({ raw: value.slice(last, match.index) });
    }
    segments.push({ open: match[1], html: match[2] });
    last = match.index + match[0].length;
  }
  if (last < value.length) {
    segments.push({ raw: value.slice(last) });
  }

  return segments;
}

// A lone bare paragraph stays unwrapped, so a plain one-liner does not gain a
// margin on the front end. An emptied field is stored as an empty string.
export function serializeParagraphs(segments) {
  if (segments.length === 1 && !('raw' in segments[0])) {
    const [{ open, html }] = segments;
    if (open === '' || (html === '' && open === '<p>')) {
      return html;
    }
  }

  return segments
    .map((segment) =>
      'raw' in segment
        ? segment.raw
        : `${segment.open || '<p>'}${segment.html}</p>`,
    )
    .join('');
}

export function ParagraphsField({
  value,
  onChange,
  placeholder,
  className,
  paragraphGap,
  labelGap,
  'aria-label': label,
}) {
  const identifier = useId();
  const { clientId } = useBlockEditContext();
  const { getSelectionStart, getSelectionEnd } = useSelect(blockEditorStore);
  const { selectionChange } = useDispatch(blockEditorStore);

  const segments = parseParagraphs(value);
  const isParagraph = (segment) => segment && !('raw' in segment);
  const paragraphCount = segments.filter(isParagraph).length;
  const fieldId = (index) => `${identifier}-${index}`;

  const commit = (next) => onChange(serializeParagraphs(next));

  const splitAt = (index, event) => {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent?.isComposing
    ) {
      return;
    }
    event.preventDefault();

    const { offset: start } = getSelectionStart();
    const { offset: end } = getSelectionEnd();
    if (typeof start !== 'number' || typeof end !== 'number') {
      return;
    }

    const richText = create({ html: segments[index].html });
    richText.start = start;
    richText.end = end;
    const parts = split(richText).map((part, position) => ({
      // Only the first part keeps the original tag and its attributes.
      open: position === 0 ? segments[index].open || '<p>' : '<p>',
      html: toHTMLString({ value: part }),
    }));

    const next = segments.slice();
    next.splice(index, 1, ...parts);
    commit(next);
    selectionChange(clientId, fieldId(index + 1), 0, 0);
  };

  const mergeAt = (index, forward) => {
    const target = forward ? index : index - 1;
    // Only paragraphs that touch merge. A list or comment between two
    // paragraphs stays where it is.
    if (!isParagraph(segments[target]) || !isParagraph(segments[target + 1])) {
      return;
    }

    const next = segments.slice();
    next.splice(target, 2, {
      ...segments[target],
      html: segments[target].html + segments[target + 1].html,
    });
    commit(next);

    const caret = create({ html: segments[target].html }).text.length;
    selectionChange(clientId, fieldId(target), caret, caret);
  };

  // Whitespace between paragraphs is a raw segment, so look past it.
  const followsLabel = (index) => {
    let previous = index - 1;
    while (
      segments[previous] &&
      'raw' in segments[previous] &&
      !segments[previous].raw.trim()
    ) {
      previous -= 1;
    }
    return (
      isParagraph(segments[previous]) &&
      STRONG_ONLY.test(segments[previous].html)
    );
  };

  // Only a caller whose front end tightens a body line under a strong-only
  // label passes labelGap; everyone else gets paragraphGap throughout.
  const gapFor = (index) => {
    if (paragraphNumber <= 1) return undefined;
    const gap =
      labelGap !== undefined && followsLabel(index) ? labelGap : paragraphGap;
    return gap === undefined || gap === '' ? undefined : { marginTop: gap };
  };

  let paragraphNumber = 0;

  return (
    <div className={className}>
      {segments.map((segment, index) => {
        if (!isParagraph(segment)) {
          // Not editable here, but it stays visible so nothing looks deleted.
          return <RawHTML key={index}>{segment.raw}</RawHTML>;
        }

        paragraphNumber += 1;

        return (
          <RichText
            // Paragraphs have no identity beyond their position, as in
            // core's former multiline RichText.
            key={index}
            identifier={fieldId(index)}
            tagName="p"
            // The wrapper is never focused, so the ring lives on the
            // paragraph that is. Same colour and width as the block's
            // heading fields.
            className="outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
            // On the paragraph itself, so it holds whatever wraps the field.
            style={gapFor(index)}
            aria-label={
              paragraphCount > 1
                ? `${label}, paragraph ${paragraphNumber}`
                : label
            }
            value={segment.html}
            onChange={(html) => {
              const next = segments.slice();
              next[index] = { ...segment, html };
              commit(next);
            }}
            onKeyDown={(event) => splitAt(index, event)}
            onMerge={(forward) => mergeAt(index, forward)}
            placeholder={paragraphNumber === 1 ? placeholder : undefined}
          />
        );
      })}
    </div>
  );
}
