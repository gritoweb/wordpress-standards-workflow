# Form embed

## When it applies

A heading, an intro, and a form, usually beside an image. The form itself comes
from a form plugin (Gravity Forms first, then a shortcode). The block never
builds fields.

## Blade skeleton

The copy column prints the pre-rendered form markup as one entrance part. The
image column reverses with `mediaPosition`:

```blade
<div class="contact-form__row {{ $mediaFirst ? 'xl:flex-row-reverse' : '' }} flex flex-col gap-8 xl:flex-row">
  <div class="contact-form__col min-w-0 xl:flex-1">
    @if ($heading !== '')<h2 class="contact-form__heading heading-2" @entrancePart($parts['heading'])>{{ $heading }}</h2>@endif
    @if ($intro !== '')<div class="contact-form__intro text-lead" @entrancePart($parts['intro'])>{!! $intro !!}</div>@endif
    @if ($form !== '')<div class="contact-form__form" @entrancePart($parts['form'])>{!! $form !!}</div>@endif
  </div>
  @if ($hasImage)
    <figure class="contact-form__media min-w-0 !m-0 xl:flex-1" @entrancePart($parts['media'])>
      {!! wp_get_attachment_image($imageId, 'large', false, ['class' => 'h-full w-full object-cover', 'style' => 'object-position: '.$imagePosition]) !!}
    </figure>
  @endif
</div>
```

`block.php` renders the form: Gravity Forms first, then a shortcode, and prints
only markup WordPress or the plugin built (ESC-3). A filter that picks the
submit button's tone from the ground is added right before the render call and
removed right after (PHP-12). A form that renders nothing leaves no empty
column.

## Canvas skeleton

An `InfoPanel` that names the form ("Gravity Forms form loads here") and, when
the site's forms are listed, previews the form's fields as inert text. It never
renders live inputs and never submits (CANVAS-11). The **Form** control lists
the site's forms by name, not by a numeric ID.

## Built from

- `EditorSection`
- `InfoPanel`
- `AttachmentImageControl`
- `ImagePositionControl`
- `InlineHeading`
- `ParagraphsField`
- `GroundSelect`
- `BlockAttributes`

## Rules that matter most

- CANVAS-11: the editor can't draw a form honestly, so it shows an `InfoPanel` that says what loads there.
- PHP-12: a filter that applies to one render is added before the call and removed after.
- ESC-3: `{!! $form !!}` prints only markup the form plugin built.
- JSON-7: the image side is `mediaPosition`, never `imageSide`.
- MEDIA-1, MEDIA-5: the image is an attachment ID, and an optional single image passes `onRemove`.
- TEXT-1, CANVAS-7: the heading is an auto-growing field with a neutral placeholder, never sample copy.
- CTA-4: the form's button follows the ground, in step with the front end.

## Adapt per design

- The image ratio and the crop.
- The form's field styles, which live in `forms.css` and `forms-gravity.css`, not in the block.
- The column shares and the default `mediaPosition`.
- Which form plugin the site uses.

## Do not change

- The form printed as one entrance part, and only when it rendered something.
- The canvas showing an `InfoPanel`, never live fields.
- The per-render filter added and removed around the call.
- Field styles staying out of `block.css`, so every form on the site looks the same.

## Tests to write

- The baseline in [Section intro](section-intro.md).
- A form that renders markup prints it in one part, and a form that renders nothing leaves the column empty of a form wrapper.
- The per-render filter is removed after the call, so a second form on the page keeps its default button.
- A hostile heading and intro stay escaped.
- Editor half: the canvas renders the `InfoPanel` and no `<input>` that submits, and the form control lists forms by name.
- Editor half: when the form list can't load (the plugin's REST API is off, or the role can't edit forms) and a form is saved, the panel offers a way to let go of it, so the editor is never stuck with a form they can't change.
- Editor half: selecting an image writes a number ID, and removing it clears the ID and the legacy URL.

## Example

`<kitPath>/examples/blocks/contact-form/` and `<kitPath>/examples/views/blocks/contact-form.blade.php`.
