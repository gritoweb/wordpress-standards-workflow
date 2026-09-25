# Location with map

## When it applies

One office with address lines, contact details, a directions button, and a map.
Use one block per office. A list of many offices is a post type and a
collection grid.

## Blade skeleton

A row that reverses with `mediaPosition`. The copy column holds the city `<h2>`,
an office group and a contact group (each one entrance part), and the button. The
map column renders only when `$hasMap`, with a text label as a sibling and a
frame that carries the coordinates for `block.js`:

```blade
<div class="location__row {{ $mediaFirst ? 'xl:flex-row-reverse' : '' }} flex flex-col gap-8 xl:flex-row">
  <div class="location__col min-w-0 xl:flex-1">
    <h2 class="location__city heading-2" @entrancePart($parts['city'])>{{ $city }}</h2>
    @if ($hasOffice)<address class="location__office" @entrancePart($parts['office'])>...</address>@endif
    @if ($hasContact)<div class="location__contact" @entrancePart($parts['contact'])>...</div>@endif
    @if ($hasCta)<a class="btn {{ $ctaButtonClass }}" href="{!! esc_url($ctaUrl) !!}">{{ $ctaText }}</a>@endif
  </div>
  @if ($hasMap)
    <div class="location__map min-w-0 xl:flex-1" @entrancePart($parts['map'])>
      <p class="sr-only" id="{{ $mapLabelId }}">{{ $mapLabel }}</p>
      <div class="location__frame" data-lat="{{ $lat }}" data-lng="{{ $lng }}" data-zoom="{{ $zoom }}"></div>
    </div>
  @endif
</div>
```

- `block.php` enqueues the map script only with valid coordinates and a registered handle (PHP-11), and reads the vendor library through its global in `block.js` (JS-8).
- When PHP builds a directions URL from the address, the button counts as complete under that condition (CTA-9).

## Canvas skeleton

The same row. Line fields are `InlineField`s with the icon beside them. An empty
group shows an `AddPrompt` ("Add office details") only while the block is
selected. The map is an `InfoPanel` that says whether a map will draw. The
button previews with `CtaPreview` and is edited on the canvas with `ActionEditor`
under it. The
**Map** panel holds the coordinates, the zoom, and the **Locate** button. Address lines are edited in place on the canvas.

## Built from

- `EditorSection`
- `InfoPanel`
- `AddPrompt`
- `InlineHeading`
- `InlineField`
- `ActionEditor`
- `CtaPreview`
- `DividerControl`
- `GroundSelect`

## Rules that matter most

- INSP-12: **Locate** turns an address into coordinates only from an explicit button, reports status in a polite live region, and ignores a stale response. It loads the Maps library on its first click, not with the editor, and says whether a failure was no match, a refused key, or a library that wouldn't load.
- A11Y-3: the map has a text label as a sibling and never `role="img"` on the frame, so the map's own links stay reachable.
- PHP-11, JS-8: the vendor script is enqueued in `block.php` and read through its global.
- CANVAS-6, CANVAS-11: empty lines show only when selected, and no live map runs on the canvas.
- CTA-2, CTA-9: the button is edited on the canvas and counts as complete with a computed destination.
- INSP-1, INSP-2: collapsed panels in the standard order.
- ENT-4: a block whose items stack down the page defaults to the `item` trigger.

## Adapt per design

- The icons beside each line.
- The map style and zoom.
- The line layout and which groups exist.
- The recommended default for `mediaPosition`.

## Do not change

- The Locate action's rules (button-only, live region, stale response ignored).
- The map label and frame contract.
- The empty defaults for `ctaIcon` (`none`) and `ctaIconPosition` (`after`), from CTA-1.
- The block rendering no map column when there are no valid coordinates.

## Tests to write

- The baseline in [Section intro](section-intro.md).
- A valid coordinate pair enqueues the map script and renders the frame, and an invalid pair or no coordinates renders neither.
- The map label sits beside the frame, and the frame has no `role="img"`.
- The directions button renders when the URL is computed from the address, and needs both label and URL otherwise.
- Editor half: empty line fields appear only when selected, and the map `InfoPanel` says whether a map will draw.
- Editor half: **Locate** runs only from its button, and a response that arrives after a newer request is ignored.

## Example

`<kitPath>/examples/blocks/location/` and `<kitPath>/examples/views/blocks/location.blade.php`.
The Google Maps key, the map style, and the script registration are the
example's, not the framework's: a site that builds a map adds them itself.
`<kitPath>/examples/README.md` lists the wiring, and the example's own files are
`<kitPath>/examples/app/maps.php`, `<kitPath>/examples/app/Settings/MapsSettings.php`, and
`<kitPath>/examples/acf-json/group___PREFIX___maps.json`.
