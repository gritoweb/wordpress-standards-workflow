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
