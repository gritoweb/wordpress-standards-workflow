/**
 * The one query every picker runs. Exported so a block that needs the same
 * records shares the request.
 *
 * `_embed` brings the featured image with the record, so a row can show the
 * same thumbnail the front end will render instead of a grey placeholder.
 */
export const postPickerQuery = {
  per_page: -1,
  status: "publish",
  orderby: "title",
  order: "asc",
  _embed: "wp:featuredmedia",
};

/** Plain text from a REST rendered field, which carries entities and tags. */
export function recordText(html) {
  const el = document.createElement("div");
  el.innerHTML = html ?? "";
  return (el.textContent ?? "").trim();
}

/** The record's embedded featured image, or null. */
export function recordThumb(record, size = "thumbnail") {
  const media = record?._embedded?.["wp:featuredmedia"]?.[0];
  return media?.media_details?.sizes?.[size]?.source_url ?? media?.source_url ?? null;
}

/**
 * The records a collection shows, in order, the same set `block.php` and the
 * adapter's selectedPosts() resolve: a password-protected record counts as
 * unavailable, exclusions win, and manual order needs an include list.
 */
export function visibleRecords({ records, includeIds = [], excludeIds = [], orderby = "manual", order = "desc", limit = 0 }) {
  const available = records.filter((record) => !record.content?.protected);
  const byId = new Map(available.map((record) => [record.id, record]));
  const excluded = new Set(excludeIds);
  const chosen = includeIds.length ? [...new Set(includeIds)].map((id) => byId.get(id)).filter(Boolean) : available;
  const visible = chosen.filter((record) => !excluded.has(record.id));

  const title = (record) => record.title?.rendered ?? "";
  const byTitle = (a, b) => title(a).localeCompare(title(b)) || a.id - b.id;
  if (orderby === "date") {
    const direction = order === "asc" ? 1 : -1;
    visible.sort((a, b) => direction * String(a.date).localeCompare(String(b.date)) || byTitle(a, b));
  } else if (orderby !== "manual" || !includeIds.length) {
    visible.sort(byTitle);
  }

  return limit > 0 ? visible.slice(0, limit) : visible;
}
