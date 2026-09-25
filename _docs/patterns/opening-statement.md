# Opening statement

## When it applies

A full-height first panel with a logo, an image, or neither above one large
statement, and an optional scroll cue that leads to the next section.

## Blade skeleton

```blade
<section class="statement-hero ... relative flex min-h-[..] flex-col" @entrance($entrance)>
  <div class="statement-hero__inner container flex flex-1 flex-col">
    @if ($hasLogo)<span class="statement-hero__logo" role="img" aria-label="{{ $logoLabel }}" @entrancePart($parts['media'])></span>@endif
    @if ($heading !== '')
      <h2 class="statement-hero__heading heading-1 heading-regular mx-auto text-center" @entrancePart($parts['heading'])>{!! $heading !!}</h2>
    @endif
    @if ($showScrollCue)
      <div class="mt-auto flex justify-center">
        <button type="button" class="statement-hero__cue" data-scroll-cue data-scroll-header-selector=".header" hidden>
          <span class="sr-only">{{ __('Scroll to the next section', '__TEXT_DOMAIN__') }}</span>
        </button>
      </div>
    @endif
  </div>
</section>
```

- The statement is inline formatted HTML that `block.php` filters with an allow-list `wp_kses` (`em`, `strong`, `br`), so `{!! $heading !!}` prints only filtered markup (ESC-3).
- The cue is the shared `scroll-cue.js`. It ships `hidden` and appears only when a next section exists.
- A logo mask span carries `role="img"` and a name. A decorative image uses `alt=""`.

## Canvas skeleton

The media (or the logo frame), a `RichText` statement (from `@wordpress/block-editor`) at `EDITOR_TYPE.statement`,
and a static cue that never scrolls. The optional parts respect
`value || isSelected`, and part indexes come from `partIndexes()`, never fixed
numbers.

## Built from

- `EditorSection`
- `AttachmentImageControl`
- `partIndexes`
- `entrancePartProps`
- `scroll-cue.js`
- `EDITOR_TYPE`
- `BlockAttributes`

## Rules that matter most

- TEXT-3: `RichText` is allowed here, because the value is inline formatted HTML filtered by an allow-list.
- TEXT-6: the statement keeps its stored type, and nothing rewrites markup on mount.
- MEDIA-1: a selection writes an ID, never a URL.
- CANVAS-6, ENT-2: optional parts show by value or selection, and take an index only when they draw.
- JS-6, JS-7: reduced motion turns the glide into a jump, and the cue measures fixed chrome (the admin bar, a sticky header) at click time.
- A11Y-5: a decorative icon is `aria-hidden`, and a logo that carries meaning has a name.
- ESC-3: `{!! !!}` prints only filtered markup.

## Adapt per design

- The logo asset and its size.
- The spacing above and below the statement.
- The statement's type class and the panel's minimum height.
- Whether the scroll cue shows, through `showScrollCue`.

## Do not change

- The `data-scroll-cue` contract and the `hidden` default.
- The `<h2>` level (the page owns the `<h1>`).
- The statement filtered with an allow-list, not `wp_kses_post()` with everything allowed.
- The empty rule: a panel with only a logo counts as content, because the canvas draws it, so the media default is `none` and the logo is an explicit choice. With neither, the block renders nothing (VIEW-4).

## Tests to write

- The baseline in [Section intro](section-intro.md).
- A statement with `em`, `strong`, `br` keeps them, and a script tag is removed.
- The cue renders only when `showScrollCue` is set, and ships `hidden`.
- Entrance indexes with the logo present and absent.
- Front-end script test (`scroll-cue.test.mjs` pattern): the cue lands past the fixed offset and moves focus to the target.
- Editor half: selecting an image writes a number ID and an empty URL, and the canvas hard-codes no part index.

## Example

`<kitPath>/examples/blocks/statement-hero/` and `<kitPath>/examples/views/blocks/statement-hero.blade.php`.
