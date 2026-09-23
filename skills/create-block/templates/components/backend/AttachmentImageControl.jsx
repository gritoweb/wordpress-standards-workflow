import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { Button, Spinner } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useLayoutEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useAttachmentUrls } from './useAttachmentUrls.js';
import { RemoveImageButton } from './RemoveImageButton.jsx';
import { image as imageIcon } from './coreIcons.jsx';

export function AttachmentImageControl({
  imageId,
  imageUrl,
  onSelect,
  onRemove,
  label = __('Image', '__TEXT_DOMAIN__'),
  emptyLabel = __('Add image', '__TEXT_DOMAIN__'),
  replaceLabel = __('Replace image', '__TEXT_DOMAIN__'),
  removeLabel = __('Remove image', '__TEXT_DOMAIN__'),
  height = '280px',
  objectFit = 'cover',
  /* `center` is the browser's own default for object-position, so every
     existing call site renders exactly as it did before this prop existed.
     It has to live here rather than in a caller's class: the image's sizing
     is written inline below, and a caller that wants to move the crop has no
     other way in. */
  objectPosition = 'center',
  background = 'var(--color-surface, #f4f1e8)',
  /* True only for a consumer that never loads the theme stylesheet — an
     inspector sidebar control, which WordPress renders outside the editor
     canvas iframe. There, the button's own bg-transparent Tailwind class
     below renders as nothing, so the browser's default button face (opaque,
     bordered) covers the preview image unless the background is reset
     inline as well. A canvas consumer already gets that reset from its
     classes and also relies on its own hover class working; an unconditional
     inline background would permanently beat that hover rule (inline styles
     outrank any external stylesheet rule), so it must stay off there. */
  noStylesheet = false,
  // Extra inline style for the rendered img only, e.g. a colour filter.
  imageStyle,
}) {
  // The sidebar renders in the admin document (the canvas is an iframe), so detect it rather than rely on the prop.
  const rootRef = useRef(null);
  const [inAdminDocument, setInAdminDocument] = useState(false);
  useLayoutEffect(() => {
    setInAdminDocument(rootRef.current?.ownerDocument === document);
  }, []);
  const withoutThemeCss = noStylesheet || inAdminDocument;

  const numericId = Number(imageId) || 0;
  const attachmentUrls = useAttachmentUrls([numericId]);
  const resolvedUrl = attachmentUrls[numericId] || '';
  const previewUrl = resolvedUrl || imageUrl || '';
  const hasReference = numericId > 0 || Boolean(imageUrl);
  const isLoading = useSelect(
    (select) =>
      numericId > 0 && select('core').isResolving('getMedia', [numericId]),
    [numericId],
  );
  const state = previewUrl
    ? 'ready'
    : isLoading
      ? 'loading'
      : hasReference
        ? 'unavailable'
        : 'empty';

  /*
   * A grid or flex item defaults to min-height:auto, so this wrapper grows to the
   * image's own height and the frame's height:100% resolves against that instead
   * of against the cell. In a fixed cell like the background media panel the
   * image then renders taller than the panel and is clipped. Only the stretch
   * case needs this; fixed-height call sites keep sizing themselves.
   */
  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={label}
      data-attachment-state={state}
      style={height === '100%' ? { height: '100%', minHeight: 0 } : undefined}
    >
      <div
        className="group relative flex w-full items-center justify-center overflow-hidden rounded-[var(--radius-card)]"
        onMouseEnter={(e) => {
          const rm = e.currentTarget.querySelector('[data-attachment-remove]');
          if (rm) rm.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          const rm = e.currentTarget.querySelector('[data-attachment-remove]');
          if (rm) rm.style.opacity = '0';
        }}
        /* The inspector sidebar never loads the theme stylesheet (it reaches
           the canvas iframe only), so `relative`/`w-full`/`overflow-hidden`
           render as nothing there. Naming them inline keeps this frame a
           positioning root and its full-frame action clickable in both
           places. */
        style={{
          height,
          background,
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-card, 8px)',
        }}
        data-attachment-image-frame
      >
        {previewUrl && (
          <img
            src={previewUrl}
            alt=""
            style={{
              display: 'block',
              width: objectFit === 'contain' ? 'auto' : '100%',
              height: objectFit === 'contain' ? 'auto' : '100%',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit,
              objectPosition,
              ...imageStyle,
            }}
          />
        )}

        {state === 'loading' && (
          <div
            className="flex items-center gap-2 px-4 text-sm text-[color:var(--color-ink)]"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Spinner />
            <span>{__('Loading image preview.', '__TEXT_DOMAIN__')}</span>
          </div>
        )}

        {state === 'unavailable' && (
          <p
            role="status"
            className="m-0 px-4 text-center text-sm"
            style={{ textAlign: 'center' }}
          >
            {__(
              'Image preview unavailable. Choose another image or remove it.',
              '__TEXT_DOMAIN__',
            )}
          </p>
        )}

        {state === 'empty' && (
          <p
            className="m-0"
            style={{ display: 'flex', width: '36px', maxWidth: '50%', color: '#949494' }}
          >
            {imageIcon}
          </p>
        )}

        <MediaUploadCheck>
          <MediaUpload
            onSelect={onSelect}
            allowedTypes={['image']}
            /* Open on the library listing. Without this the frame opens on
               its upload pane, so replacing an image that already exists
               starts by asking for a new file. Same call hero/block.jsx
               already makes. */
            mode="browse"
            value={numericId}
            render={({ open }) => (
              <button
                type="button"
                aria-label={hasReference ? replaceLabel : emptyLabel}
                className="absolute inset-0 z-10 cursor-pointer rounded-[var(--radius-card)] border-0 bg-transparent p-0 text-left transition-colors hover:bg-[color:var(--color-ink)]/10 focus-visible:ring-2 focus-visible:ring-[color:var(--color-ink)] focus-visible:outline-0 focus-visible:ring-inset"
                onClick={open}
                data-attachment-image-action
                /* The inspector sidebar never loads the theme stylesheet, so the
                   Tailwind reset classes above (bg-transparent, border-0, p-0)
                   render as nothing there and the UA button face (opaque gray,
                   a border, and its own padding) covers the preview image.
                   Naming the same resets inline keeps the button invisible in
                   both places. */
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  ...(withoutThemeCss ? { background: 'transparent' } : {}),
                  border: 0,
                  padding: 0,
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              />
            )}
          />
        </MediaUploadCheck>

        {hasReference && onRemove && (
          // Shown on hover/focus by the frame's handlers; the button itself is the shared RemoveImageButton.
          <div
            data-attachment-remove
            onFocus={(e) => { e.currentTarget.style.opacity = '1'; }}
            onBlur={(e) => { e.currentTarget.style.opacity = '0'; }}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              zIndex: 30,
              opacity: 0,
              transition: 'opacity 0.2s ease',
            }}
          >
            <RemoveImageButton label={removeLabel} onClick={onRemove} />
          </div>
        )}
      </div>


    </div>
  );
}
