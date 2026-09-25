import { useSelect } from "@wordpress/data";
import { __, _n, sprintf } from "@wordpress/i18n";
import { pagingSummary } from "./PagingControls.jsx";
import { postPickerQuery } from "./postPickerQuery.js";

// The same array every render: useSelect compares what the callback returns,
// and a fresh [] each time would never compare equal.
const NO_RECORDS = [];

const ORDER_DESCRIPTIONS = {
  manual: (hasList) =>
    hasList
      ? __("in the order of the list.", "__TEXT_DOMAIN__")
      : __("by title.", "__TEXT_DOMAIN__"),
  title: () => __("by title.", "__TEXT_DOMAIN__"),
  date: () => __("newest first.", "__TEXT_DOMAIN__"),
};

/**
 * The honest summary a collection block's canvas shows (COLL-5): how many
 * records show, in what order, and how they page. `records` is what the
 * query returned (null while loading). Never a card row, never a total passed
 * off as a filtered count.
 *
 * @return {{state: string, message: string, extra: string|null}} `state` is
 *   unset, loading, error or resolved, for `data-collection-state`.
 */
export function summarizeCollection({
  contentType,
  records,
  queryFailed = false,
  includeIds = [],
  excludeIds = [],
  orderby = "manual",
  postsPerPage,
  pagination,
  moreText,
}) {
  if (!contentType) {
    return {
      state: "unset",
      message: __(
        "Choose a content type to show its records here.",
        "__TEXT_DOMAIN__",
      ),
      extra: null,
    };
  }

  if (queryFailed) {
    return {
      state: "error",
      message: __(
        "This content couldn't load, so the count is unknown. Your lists are kept.",
        "__TEXT_DOMAIN__",
      ),
      extra: null,
    };
  }

  if (records === null || records === undefined) {
    return {
      state: "loading",
      message: __("Loading…", "__TEXT_DOMAIN__"),
      extra: null,
    };
  }

  // A password-protected record counts as unavailable, the same as the query
  // the front end runs.
  const available = new Set(
    records
      .filter((record) => !record.content?.protected)
      .map((record) => record.id),
  );
  const excluded = new Set(excludeIds);
  const chosen = includeIds.length ? [...new Set(includeIds)] : [...available];
  const shown = chosen.filter(
    (id) => available.has(id) && !excluded.has(id),
  ).length;
  const unavailable = chosen.filter((id) => !available.has(id)).length;

  return {
    state: "resolved",
    message: [
      sprintf(
        /* translators: %d: number of records the grid shows. */
        _n("%d shown,", "%d shown,", shown, "__TEXT_DOMAIN__"),
        shown,
      ),
      (ORDER_DESCRIPTIONS[orderby] ?? ORDER_DESCRIPTIONS.manual)(
        includeIds.length > 0,
      ),
      pagingSummary({ postsPerPage, pagination, moreText }),
    ].join(" "),
    extra:
      unavailable > 0
        ? sprintf(
            /* translators: %d: chosen records that are not published or visible. */
            _n(
              "%d chosen record is not published and will not appear.",
              "%d chosen records are not published and will not appear.",
              unavailable,
              "__TEXT_DOMAIN__",
            ),
            unavailable,
          )
        : null,
  };
}

/**
 * Runs the query and returns summarizeCollection() over it. Like any hook,
 * call it before the block's `isPreview` early return.
 */
export function useCollectionSummary(attributes) {
  const { contentType } = attributes;
  const { records, queryFailed } = useSelect(
    (select) => ({
      records: contentType
        ? select("core").getEntityRecords(
            "postType",
            contentType,
            postPickerQuery,
          )
        : NO_RECORDS,
      queryFailed: contentType
        ? select("core").hasResolutionFailed("getEntityRecords", [
            "postType",
            contentType,
            postPickerQuery,
          ])
        : false,
    }),
    [contentType],
  );

  return summarizeCollection({
    ...attributes,
    includeIds: Array.isArray(attributes.includeIds)
      ? attributes.includeIds
      : [],
    excludeIds: Array.isArray(attributes.excludeIds)
      ? attributes.excludeIds
      : [],
    records,
    queryFailed,
  });
}
