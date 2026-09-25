# Collection grid

## When it applies

Cards drawn from a post type that an editor chooses, sorts, and pages. The
records come from WordPress, not from fields typed into the block. If the
editor types each card by hand, build a repeater instead (see the index).

## Blade skeleton

```blade
{{-- Column classes stay literal per count so Tailwind's scanner finds them. --}}
<ul class="post-grid__grid grid grid-cols-1 gap-8 @if ($columns >= 2) sm:grid-cols-2 @endif @if ($columns === 3) lg:grid-cols-3 @endif @if ($columns === 4) lg:grid-cols-4 @endif"
  id="{{ $paging['key'] }}">
  @foreach ($items as $item)
    <li @entrancePart(min($loop->index, 8))>@include('partials.post-grid-card', ['item' => $item, 'linkText' => $linkText])</li>
  @endforeach
</ul>
@include('partials.collection-paging', ['paging' => $paging])
```

`block.php` does the query work, never the view:

- `ContentTypes::adapter($contentType)` finds the records and shapes each card.
- `Paging::paginate()` returns the page that renders, and cards are built only for that page.
- The block uses the `item` entrance trigger, with the `<li>` as the part and never the card's stretched link.
- The shared `collection-paging.js` and `collection-paging.css` load by handle, and without JavaScript the pager links still work.

## Canvas skeleton

One `InfoPanel` titled "<Things> load here" with an honest summary: how many
records show, in what order, and how they page. The canvas never draws a card
row.

```jsx
const summary = useCollectionSummary(attributes);
<InfoPanel data-collection-state={summary.state} title={__('Posts load here', '__TEXT_DOMAIN__')}>{summary.message}</InfoPanel>
```

The **Content** panel holds the content type select, a `PostPicker` for the
include list, a second `PostPicker` for the exclude list, and the **Sort**
select. **Layout** holds **Columns**, **Results per page**, **Paging**, and
**Load more label** (through `PagingControls`). The card link's label sits in
its own panel.

## Built from

- `EditorSection`
- `InfoPanel`
- `PostPicker`
- `postPickerQuery`
- `PagingControls`
- `useCollectionSummary`
- `ContentTypes`
- `Paging`
- `post-grid-card`
- `collection-paging`
- `collection-paging.js`

## Rules that matter most

- COLL-1, COLL-2: the adapter, the paging helper, and the attribute vocabulary (`contentType`, `includeIds`, `excludeIds`, `orderby`, `columns`, `postsPerPage`, `pagination`, `moreText`, `linkText`).
- COLL-4: the selection rule is the same in PHP and on the canvas (manual order, empty include list means everything, exclude always wins, missing IDs stay visible).
- COLL-5: the summary reports `unset`, `loading`, `error`, and `resolved` through `data-collection-state`.
- COLL-7, COLL-8: the `<ul id>` and `<li>` parts, and a part index capped at 8.
- COLL-9: the editor's content-type list mirrors `ContentTypes::ADAPTERS`, with a comment on each to change both.
- CANVAS-11: no cards, query results, or paging on the canvas.
- CTA-7: cards that share a "Read more" label add hidden context with the record title.
- ENT-3, ENT-4: the `item` trigger, with the directive on the `<li>`.

## Adapt per design

- The card partial and the adapter's `card()` method. The block itself doesn't change.
- The column classes and the gap.
- The card's link label and layout.
- A post type's extra sort keys, which live in its adapter.

## Do not change

- The block's attribute names and the **Content** panel order.
- The query in `block.php` and the adapter, never in the Blade view.
- Paging that works without JavaScript.
- The canvas summary staying a summary. A collection never draws a fake card row.

## Tests to write

- The baseline in [Section intro](section-intro.md), and the collection cases in TEST-4.
- Each sort: manual (with and without a list), title, date, and any key the adapter adds.
- The include and exclude rules: an excluded ID never shows, a missing ID is reported, and a password-protected record counts as unavailable.
- Paging: `postsPerPage` of 0 shows all, `pager` and `loadMore` both render, and the pager links work with no script.
- Editor half: the summary for loading, a failed query, a successful empty result, and unavailable choices.
- Editor half: the content-type list equals the adapter list (COLL-9).

## Example

`<kitPath>/examples/blocks/post-grid/` and `<kitPath>/examples/views/blocks/post-grid.blade.php`. The
adapter contract is in `_docs/content-types.md`.
