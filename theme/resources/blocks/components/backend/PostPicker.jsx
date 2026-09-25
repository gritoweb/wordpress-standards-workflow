import { SelectControl, Notice, Button } from "@wordpress/components";
import { useSelect } from "@wordpress/data";
import { __, sprintf } from "@wordpress/i18n";
import { ItemList } from "./ItemList.jsx";
import { moveItem } from "./moveItem.js";
import { postPickerQuery } from "./postPickerQuery.js";

export { postPickerQuery };

/**
 * Pick records of a post type and put them in a hand-set order.
 *
 * The chosen rows are rendered by ItemList — the same control every other
 * reorderable list in the framework uses, so a picked list drags, reorders
 * and removes the same way everywhere.
 *
 * The value is an ARRAY OF IDs and the array's order IS the render order.
 * That is the whole point: an order held in a number field on each record
 * cannot express "these, in this order" without the editor opening every
 * record and keeping every number in their head.
 *
 * What an EMPTY value means is the caller's call (a directory block might
 * show everyone by default; a curated list shows nothing), so the caller
 * says it through `emptyNotice`, and offers a way back to empty through
 * `clearLabel`.
 *
 * @param {object}   props
 * @param {string}   props.postType      A registered post type slug.
 * @param {number[]} props.value         Chosen IDs, in order.
 * @param {Function} props.onChange      Receives the next array of IDs.
 * @param {string}   [props.label]
 * @param {string}   [props.help]
 * @param {string}   [props.emptyNotice] Shown when nothing is chosen.
 * @param {string}   [props.addLabel]
 * @param {Function} [props.getMeta]     Secondary row line from the record.
 * @param {Function} [props.filter]      Which records the add dropdown offers.
 * @param {string}   [props.clearLabel]  Shows a clear-the-list action.
 */
export function PostPicker({
  postType,
  value,
  onChange,
  label = __("Items", "__TEXT_DOMAIN__"),
  help,
  emptyNotice,
  addLabel = __("Add", "__TEXT_DOMAIN__"),
  getMeta,
  filter = () => true,
  clearLabel,
}) {
  const records = useSelect(
    (select) =>
      select("core").getEntityRecords("postType", postType, postPickerQuery),
    [postType],
  );

  const loading = records === null;
  const all = records || [];
  const byId = new Map(all.map((r) => [r.id, r]));

  const chosenIds = Array.isArray(value) ? value : [];

  const titleOf = (record) => {
    const raw = record && record.title && record.title.rendered;
    // The REST title is rendered HTML, so entities come through as &#8217;.
    if (!raw) return "";
    const el = document.createElement("textarea");
    el.innerHTML = raw;
    return el.value;
  };

  const thumbOf = (record) => {
    const media =
      record &&
      record._embedded &&
      record._embedded["wp:featuredmedia"] &&
      record._embedded["wp:featuredmedia"][0];
    if (!media) return null;
    const sizes = media.media_details && media.media_details.sizes;
    return (
      (sizes && sizes.thumbnail && sizes.thumbnail.source_url) ||
      media.source_url ||
      null
    );
  };

  // A chosen id whose record is gone (unpublished, trashed) still has to show,
  // or the editor cannot tell why the count dropped and cannot remove the row.
  const rows = chosenIds.map((id) => {
    const record = byId.get(id);
    return {
      key: `id-${id}`,
      id,
      record,
      title: record ? titleOf(record) : null,
      thumb: record ? thumbOf(record) : null,
    };
  });

  const remaining = all.filter((r) => !chosenIds.includes(r.id) && filter(r));

  const move = (from, to) => {
    onChange(moveItem(chosenIds, from, to));
  };

  return (
    <div>
      <p
        style={{
          margin: "0 0 8px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          color: "#757575",
        }}
      >
        {label}
      </p>

      {loading && (
        <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#757575" }}>
          {__("Loading…", "__TEXT_DOMAIN__")}
        </p>
      )}

      {!loading && chosenIds.length === 0 && emptyNotice && (
        <div style={{ marginBottom: "16px" }}>
          <Notice status="info" isDismissible={false}>
            {emptyNotice}
          </Notice>
        </div>
      )}

      {!loading && chosenIds.length > 0 && (
        <ItemList
          items={rows}
          selectable={false}
          minItems={0}
          onRemove={(index) =>
            onChange(chosenIds.filter((_, i) => i !== index))
          }
          onMove={move}
          getLabel={(row) =>
            row.title !== null
              ? row.title
              : sprintf(
                  /* translators: %d: the post ID that no longer resolves. */
                  __("Missing (ID %d)", "__TEXT_DOMAIN__"),
                  row.id,
                )
          }
          getMeta={(row) =>
            row.title === null
              ? __(
                  "Not published — remove it or publish it again",
                  "__TEXT_DOMAIN__",
                )
              : getMeta && row.record
                ? getMeta(row.record)
                : null
          }
          getThumb={(row) => row.thumb}
          removeConfirm={null}
        />
      )}

      {!loading && remaining.length > 0 && (
        <SelectControl
          label={addLabel}
          value=""
          options={[
            { label: __("Choose one…", "__TEXT_DOMAIN__"), value: "" },
            ...remaining.map((r) => ({
              label: titleOf(r) || sprintf("#%d", r.id),
              value: String(r.id),
            })),
          ]}
          onChange={(next) => {
            if (!next) return;
            onChange([...chosenIds, parseInt(next, 10)]);
          }}
          help={help}
        />
      )}

      {!loading && remaining.length === 0 && all.length > 0 && (
        <p style={{ margin: 0, fontSize: "13px", color: "#757575" }}>
          {__("Nothing else to add.", "__TEXT_DOMAIN__")}
        </p>
      )}

      {!loading && all.length === 0 && (
        <div style={{ marginBottom: "16px" }}>
          <Notice status="warning" isDismissible={false}>
            {__("Nothing is published to choose from yet.", "__TEXT_DOMAIN__")}
          </Notice>
        </div>
      )}

      {chosenIds.length > 0 && clearLabel && (
        <Button
          variant="link"
          isDestructive
          onClick={() => onChange([])}
          style={{ marginTop: "8px", fontSize: "12px" }}
        >
          {clearLabel}
        </Button>
      )}
    </div>
  );
}
