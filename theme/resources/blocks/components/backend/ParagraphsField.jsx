import {
  BlockControls,
  RichText,
  store as blockEditorStore,
  useBlockEditContext,
} from "@wordpress/block-editor";
import { ToolbarButton, ToolbarGroup } from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { RawHTML, useId } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { create, split, toHTMLString } from "@wordpress/rich-text";

const PARAGRAPH = /(<p(?:\s[^>]*)?>)([\s\S]*?)<\/p>/gi;
const HAS_PARAGRAPH = /<(?:p|ul|ol)[\s>]/i;
// A flat list only: an item that holds another list or item tag stays raw, so
// nested markup is never rewritten.
const ITEM_BODY = "(?:(?!<\\/?(?:ul|ol|li)[\\s>])[\\s\\S])*";
const FLAT_LIST = new RegExp(
  `<(ul|ol)(\\s[^>]*)?>((?:\\s*<li(?:\\s[^>]*)?>${ITEM_BODY}</li>)+\\s*)</\\1>`,
  "gi",
);
const LIST_ITEM = new RegExp(
  `(\\s*)(<li(?:\\s[^>]*)?>)(${ITEM_BODY})</li>`,
  "gi",
);
const LIST_OPEN = /<(?:ul|ol)[\s>]/gi;
const ALLOWED_FORMATS = ["core/bold", "core/italic", "core/link"];
const STRONG_ONLY = /^\s*<strong>[\s\S]*<\/strong>\s*$/i;

// A raw segment that holds only flat top-level lists becomes editable list
// segments. Any nested list leaves the whole segment raw.
function splitLists(raw) {
  const lists = [...raw.matchAll(FLAT_LIST)];
  if (
    lists.length === 0 ||
    lists.length !== (raw.match(LIST_OPEN) || []).length
  ) {
    return [{ raw }];
  }

  const segments = [];
  let last = 0;
  for (const list of lists) {
    if (list.index > last) {
      segments.push({ raw: raw.slice(last, list.index) });
    }
    segments.push({
      tag: list[1],
      open: `<${list[1]}${list[2] ?? ""}>`,
      items: [...list[3].matchAll(LIST_ITEM)].map(([, pre, open, html]) => ({
        pre,
        open,
        html,
      })),
      post: /\s*$/.exec(list[3])[0],
    });
    last = list.index + list[0].length;
  }
  if (last < raw.length) {
    segments.push({ raw: raw.slice(last) });
  }

  return segments;
}

// Splits a value into paragraphs and flat lists, which are editable, and raw
// segments, which are everything else (headings, comments, nested lists,
// whitespace) and serialize back untouched. A paragraph keeps its own opening
// tag and attributes. A value without `<p>`, `<ul>` or `<ol>` is one bare
// paragraph.
export function parseParagraphs(html) {
  const value = html || "";
  if (!HAS_PARAGRAPH.test(value)) {
    return [{ open: "", html: value }];
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

  return segments.flatMap((segment) =>
    "raw" in segment ? splitLists(segment.raw) : [segment],
  );
}

// A lone bare paragraph stays unwrapped, so a plain one-liner does not gain a
// margin on the front end. An emptied field is stored as an empty string.
export function serializeParagraphs(segments) {
  if (segments.length === 1 && !("raw" in segments[0])) {
    const [{ open, html }] = segments;
    if (open === "" || (html === "" && open === "<p>")) {
      return html;
    }
  }

  return segments
    .map((segment) => {
      if ("raw" in segment) return segment.raw;
      if ("items" in segment) {
        const items = segment.items
          .map((item) => `${item.pre}${item.open}${item.html}</li>`)
          .join("");
        return `${segment.open}${items}${segment.post}</${segment.tag}>`;
      }
      return `${segment.open || "<p>"}${segment.html}</p>`;
    })
    .join("");
}

const RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]";

const newParagraph = (html = "") => ({ open: "<p>", html });

export function ParagraphsField({
  value,
  onChange,
  placeholder,
  className,
  paragraphGap,
  labelGap,
  "aria-label": label,
}) {
  const identifier = useId();
  const { clientId } = useBlockEditContext();
  const { getSelectionStart, getSelectionEnd } = useSelect(blockEditorStore);
  const { selectionChange } = useDispatch(blockEditorStore);

  const segments = parseParagraphs(value);
  const isParagraph = (segment) =>
    segment && !("raw" in segment) && !("items" in segment);
  const isList = (segment) => segment && "items" in segment;
  const paragraphCount = segments.filter(isParagraph).length;
  // One id per editable field: `<segment>` for a paragraph, `<segment>-<item>`
  // for a list item.
  const fieldId = (index, item) =>
    item === undefined
      ? `${identifier}-${index}`
      : `${identifier}-${index}-${item}`;

  const commit = (next) => onChange(serializeParagraphs(next));
  const focus = (id, offset) => selectionChange(clientId, id, offset, offset);
  const replaceAt = (index, count, ...items) => {
    const next = segments.slice();
    next.splice(index, count, ...items);
    commit(next);
  };

  const isPlainEnter = (event) =>
    event.key === "Enter" && !event.shiftKey && !event.nativeEvent?.isComposing;

  // The field the caret is in, read back from the selection store, so the
  // toolbar buttons act on it without any state here.
  const focusedField = () => {
    const key = getSelectionStart()?.attributeKey;
    if (typeof key !== "string" || !key.startsWith(`${identifier}-`))
      return null;
    const [index, item] = key
      .slice(identifier.length + 1)
      .split("-")
      .map(Number);
    return segments[index]
      ? { index, item, offset: getSelectionStart().offset }
      : null;
  };

  // Splits one field's html at the caret. Null when there is no text caret.
  const splitHtml = (html) => {
    const { offset: start } = getSelectionStart();
    const { offset: end } = getSelectionEnd();
    if (typeof start !== "number" || typeof end !== "number") return null;

    const richText = create({ html });
    richText.start = start;
    richText.end = end;
    return split(richText).map((part) => toHTMLString({ value: part }));
  };

  const splitAt = (index, event) => {
    if (!isPlainEnter(event)) return;
    event.preventDefault();

    const parts = splitHtml(segments[index].html);
    if (!parts) return;

    replaceAt(
      index,
      1,
      // Only the first part keeps the original tag and its attributes.
      ...parts.map((html, position) => ({
        open: position === 0 ? segments[index].open || "<p>" : "<p>",
        html,
      })),
    );
    focus(fieldId(index + 1), 0);
  };

  const mergeAt = (index, forward) => {
    const target = forward ? index : index - 1;
    // Only paragraphs that touch merge. A list or comment between two
    // paragraphs stays where it is.
    if (!isParagraph(segments[target]) || !isParagraph(segments[target + 1])) {
      return;
    }

    replaceAt(target, 2, {
      ...segments[target],
      html: segments[target].html + segments[target + 1].html,
    });

    const caret = create({ html: segments[target].html }).text.length;
    focus(fieldId(target), caret);
  };

  const withItems = (list, items) => ({ ...list, items });

  const splitItem = (index, position, event) => {
    if (!isPlainEnter(event)) return;
    event.preventDefault();

    const list = segments[index];
    const item = list.items[position];
    const rest = list.items.filter((_, at) => at !== position);

    // Enter on an empty last item leaves the list for a new paragraph.
    if (item.html === "" && position === list.items.length - 1) {
      replaceAt(
        index,
        1,
        ...(rest.length ? [withItems(list, rest)] : []),
        newParagraph(),
      );
      focus(fieldId(rest.length ? index + 1 : index), 0);
      return;
    }

    const parts = splitHtml(item.html);
    if (!parts) return;

    const items = list.items.slice();
    items.splice(
      position,
      1,
      ...parts.map((html, at) =>
        at === 0 ? { ...item, html } : { pre: "", open: "<li>", html },
      ),
    );
    replaceAt(index, 1, withItems(list, items));
    focus(fieldId(index, position + 1), 0);
  };

  const mergeItem = (index, position, forward) => {
    const list = segments[index];
    const target = forward ? position : position - 1;

    if (target >= 0) {
      if (!list.items[target + 1]) return;
      const items = list.items.slice();
      items.splice(target, 2, {
        ...items[target],
        html: items[target].html + items[target + 1].html,
      });
      replaceAt(index, 1, withItems(list, items));
      focus(
        fieldId(index, target),
        create({ html: list.items[target].html }).text.length,
      );
      return;
    }

    if (forward) return;

    // Backspace at the start of the first item lifts it out of the list.
    const rest = list.items.slice(1);
    replaceAt(
      index,
      1,
      newParagraph(list.items[0].html),
      ...(rest.length ? [withItems(list, rest)] : []),
    );
    focus(fieldId(index), 0);
  };

  const toggleList = (tag) => {
    const field = focusedField();
    if (!field) return;

    const segment = segments[field.index];
    const { index, item = 0, offset } = field;

    if (isParagraph(segment)) {
      replaceAt(index, 1, {
        tag,
        open: `<${tag}>`,
        items: [{ pre: "", open: "<li>", html: segment.html }],
        post: "",
      });
      focus(fieldId(index, 0), offset);
    } else if (isList(segment) && segment.tag.toLowerCase() === tag) {
      replaceAt(
        index,
        1,
        ...segment.items.map(({ html }) => newParagraph(html)),
      );
      focus(fieldId(index + item), offset);
    } else if (isList(segment)) {
      replaceAt(index, 1, {
        ...segment,
        tag,
        open: segment.open.replace(/^<(?:ul|ol)/i, `<${tag}`),
      });
      focus(fieldId(index, item), offset);
    }
  };

  // Whitespace between paragraphs is a raw segment, so look past it.
  const followsLabel = (index) => {
    let previous = index - 1;
    while (
      segments[previous] &&
      "raw" in segments[previous] &&
      !segments[previous].raw.trim()
    ) {
      previous -= 1;
    }
    return (
      isParagraph(segments[previous]) &&
      STRONG_ONLY.test(segments[previous].html)
    );
  };

  let paragraphNumber = 0;
  let listNumber = 0;
  let editableCount = 0;

  // Only a caller whose front end tightens a body line under a strong-only
  // label passes labelGap; everyone else gets paragraphGap throughout.
  const gapFor = (index) => {
    if (editableCount === 0) return undefined;
    const gap =
      labelGap !== undefined && followsLabel(index) ? labelGap : paragraphGap;
    return gap === undefined || gap === "" ? undefined : { marginTop: gap };
  };

  return (
    <div className={className}>
      <BlockControls group="block">
        <ToolbarGroup>
          <ToolbarButton
            icon="editor-ul"
            label={__("Bulleted list", "__TEXT_DOMAIN__")}
            onClick={() => toggleList("ul")}
          />
          <ToolbarButton
            icon="editor-ol"
            label={__("Numbered list", "__TEXT_DOMAIN__")}
            onClick={() => toggleList("ol")}
          />
        </ToolbarGroup>
      </BlockControls>
      {segments.map((segment, index) => {
        if (isList(segment)) {
          listNumber += 1;
          const ListTag = segment.tag.toLowerCase();
          const style = gapFor(index);
          editableCount += 1;

          return (
            <ListTag
              key={index}
              className={
                ListTag === "ol" ? "list-decimal pl-6" : "list-disc pl-6"
              }
              style={style}
            >
              {segment.items.map((item, position) => (
                <RichText
                  key={position}
                  identifier={fieldId(index, position)}
                  tagName="li"
                  className={RING}
                  aria-label={`${label}, list ${listNumber}, item ${position + 1}`}
                  allowedFormats={ALLOWED_FORMATS}
                  value={item.html}
                  onChange={(html) => {
                    const items = segment.items.slice();
                    items[position] = { ...item, html };
                    replaceAt(index, 1, withItems(segment, items));
                  }}
                  onKeyDown={(event) => splitItem(index, position, event)}
                  onMerge={(forward) => mergeItem(index, position, forward)}
                />
              ))}
            </ListTag>
          );
        }

        if (!isParagraph(segment)) {
          // Not editable here, but it stays visible so nothing looks deleted.
          return <RawHTML key={index}>{segment.raw}</RawHTML>;
        }

        paragraphNumber += 1;
        const style = gapFor(index);
        const isFirst = editableCount === 0;
        editableCount += 1;

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
            className={RING}
            // On the paragraph itself, so it holds whatever wraps the field.
            style={style}
            aria-label={
              paragraphCount > 1
                ? `${label}, paragraph ${paragraphNumber}`
                : label
            }
            allowedFormats={ALLOWED_FORMATS}
            value={segment.html}
            onChange={(html) => {
              const next = segments.slice();
              next[index] = { ...segment, html };
              commit(next);
            }}
            onKeyDown={(event) => splitAt(index, event)}
            onMerge={(forward) => mergeAt(index, forward)}
            placeholder={isFirst ? placeholder : undefined}
          />
        );
      })}
    </div>
  );
}
