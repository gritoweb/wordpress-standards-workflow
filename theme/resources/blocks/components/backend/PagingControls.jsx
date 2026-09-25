import {
  RangeControl,
  SelectControl,
  TextControl,
} from "@wordpress/components";
import { __, sprintf } from "@wordpress/i18n";

/**
 * Results per page and how the next page arrives (COLL-6), shared by every
 * collection block so they page the same way. Put it in the Layout panel,
 * after Columns.
 *
 * @param {object}   props
 * @param {object}   props.attributes    Reads postsPerPage, pagination, moreText.
 * @param {Function} props.setAttributes
 */
export function PagingControls({ attributes, setAttributes }) {
  const { postsPerPage, pagination, moreText } = attributes;

  return (
    <>
      <RangeControl
        label={__("Results per page", "__TEXT_DOMAIN__")}
        help={__("Zero shows everything on one page.", "__TEXT_DOMAIN__")}
        value={postsPerPage}
        onChange={(value) => setAttributes({ postsPerPage: value ?? 0 })}
        min={0}
        max={48}
      />
      <SelectControl
        label={__("Paging", "__TEXT_DOMAIN__")}
        value={pagination}
        options={[
          { label: __("Numbered pages", "__TEXT_DOMAIN__"), value: "pager" },
          {
            label: __("Load more button", "__TEXT_DOMAIN__"),
            value: "loadMore",
          },
        ]}
        onChange={(value) => setAttributes({ pagination: value })}
      />
      {pagination === "loadMore" && (
        <TextControl
          label={__("Load more label", "__TEXT_DOMAIN__")}
          value={moreText}
          onChange={(value) => setAttributes({ moreText: value })}
        />
      )}
    </>
  );
}

/**
 * The canvas line describing the paging setup.
 */
export function pagingSummary({ postsPerPage, pagination, moreText }) {
  if (!(postsPerPage > 0)) {
    return __("All on one page.", "__TEXT_DOMAIN__");
  }

  return pagination === "pager"
    ? sprintf(
        /* translators: %d: results per page. */
        __("%d per page, with numbered pages.", "__TEXT_DOMAIN__"),
        postsPerPage,
      )
    : sprintf(
        /* translators: 1: results per page. 2: the button label. */
        __("%1$d per page, with a %2$s button.", "__TEXT_DOMAIN__"),
        postsPerPage,
        moreText || __("Load More", "__TEXT_DOMAIN__"),
      );
}
