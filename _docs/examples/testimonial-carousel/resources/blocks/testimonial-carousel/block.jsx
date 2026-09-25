import { registerBlockType } from '@wordpress/blocks';
import {
  useBlockProps,
  InspectorControls,
  RichText,
} from '@wordpress/block-editor';
import { PanelBody, RangeControl, ToggleControl } from '@wordpress/components';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { AutoGrowingTextarea } from '../components/backend/AutoGrowingTextarea.jsx';
import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
import { ItemList } from '../components/backend/ItemList.jsx';
import { moveItem } from '../components/backend/moveItem.js';
import { useAttachmentUrls } from '../components/backend/useAttachmentUrls.js';
import { PaddingControls } from '../components/backend/PaddingControls.jsx';
import { editorPaddingClasses } from '../components/backend/padding-presets.js';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import {
  resolveEntrance,
  entranceRootProps,
  entrancePartProps,
} from '../components/backend/entranceCanvas.js';
import { EDITOR_BLOCK_FRAME } from '../components/backend/editorCanvas.js';
import previewImage from './preview.svg';
import metadata from './block.json';

// Same layout as block.js on a desktop viewport: two slides, 24px apart.
const GAP = 24;

// Splide's breakpoint (block.js): one slide below 768px, two from 768px — read on the canvas iframe, not the admin window.
const useSlidesPerView = (ref) => {
  const [perView, setPerView] = useState(1);
  useEffect(() => {
    const view = ref.current?.ownerDocument.defaultView;
    if (!view) return undefined;
    const query = view.matchMedia('(min-width: 768px)');
    const update = () => setPerView(query.matches ? 2 : 1);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [ref]);
  return perView;
};

const emptyItem = () => ({ quote: '', author: '', role: '', avatarId: 0 });

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    // Hooks run before the preview return, so their order never changes.
    const [activeItem, setActiveItem] = useState(0);
    const [firstVisible, setFirstVisible] = useState(0);
    const blockProps = useBlockProps();
    const viewportRef = useRef(null);
    const perView = useSlidesPerView(viewportRef);
    const items = Array.isArray(attributes.items) ? attributes.items : [];
    const avatars = useAttachmentUrls(
      items.map((item) => Number(item.avatarId) || 0),
    );

    if (attributes.isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Testimonial Carousel preview', '<text-domain>')}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      );
    }

    const entrance = resolveEntrance(
      attributes.entrance,
      metadata.attributes.entrance.default,
    );
    const rootEntrance = entranceRootProps(entrance);

    // Splide's page count with perMove 1: one bullet per position the first visible slide can take.
    const pages = Math.max(1, items.length - perView + 1);
    const page = Math.min(firstVisible, pages - 1);
    const selected = Math.min(activeItem, Math.max(items.length - 1, 0));

    // Selecting a slide scrolls only when it is off screen, so editing never moves the track.
    const selectSlide = (index) => {
      setActiveItem(index);
      if (index < page) setFirstVisible(index);
      else if (index > page + perView - 1) setFirstVisible(index - perView + 1);
    };

    const updateItem = (index, patch) =>
      setAttributes({
        items: items.map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        ),
      });
    const addItem = () => {
      setAttributes({ items: [...items, emptyItem()] });
      selectSlide(items.length);
    };
    const removeItem = (index) => {
      setAttributes({ items: items.filter((_, i) => i !== index) });
      setActiveItem((current) =>
        Math.max(0, current > index ? current - 1 : current),
      );
    };

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Slides', '<text-domain>')} initialOpen>
            <ItemList
              items={items}
              activeItem={selected}
              setActiveItem={selectSlide}
              onAdd={addItem}
              onRemove={removeItem}
              onMove={(from, to) =>
                setAttributes({ items: moveItem(items, from, to) })
              }
              getLabel={(item) => item.author}
              getThumb={(item) => avatars[Number(item.avatarId)] || ''}
              addButtonLabel={__('+ Add slide', '<text-domain>')}
              itemLabelPrefix={__('Slide', '<text-domain>')}
            />
          </PanelBody>
          <PanelBody title={__('Autoplay', '<text-domain>')} initialOpen={false}>
            <ToggleControl
              __nextHasNoMarginBottom
              label={__('Advance slides automatically', '<text-domain>')}
              help={__(
                'Pauses on hover; off for visitors who reduce motion.',
                '<text-domain>',
              )}
              checked={!!attributes.autoplay}
              onChange={(value) => setAttributes({ autoplay: value })}
            />
            {attributes.autoplay && (
              <RangeControl
                __nextHasNoMarginBottom
                label={__('Seconds per slide', '<text-domain>')}
                min={2}
                max={15}
                value={attributes.autoplaySeconds}
                onChange={(value) => setAttributes({ autoplaySeconds: value })}
              />
            )}
          </PanelBody>
          <PaddingControls
            attributes={attributes}
            setAttributes={setAttributes}
          />
          <EntranceControl
            attributes={attributes}
            setAttributes={setAttributes}
            clientId={clientId}
          />
        </InspectorControls>

        <section
          {...blockProps}
          {...rootEntrance}
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} testimonial-carousel bg-surface ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...rootEntrance.style,
          }}
        >
          <AutoGrowingTextarea
            {...entrancePartProps(entrance, 0)}
            value={attributes.title}
            onChange={(value) => setAttributes({ title: value })}
            heading
            placeholder={__('Section title…', '<text-domain>')}
            className="heading-2 mb-10 text-center"
          />

          {/* The front end's carousel, driven by the bullets and the sidebar list instead of Splide. */}
          <div
            {...entrancePartProps(entrance, 1)}
            ref={viewportRef}
            className="overflow-hidden"
          >
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{
                gap: `${GAP}px`,
                transform: `translateX(calc(${-page} * (${100 / perView}% + ${GAP / perView}px)))`,
              }}
            >
              {items.map((item, index) => (
                <figure
                  key={index}
                  className="card flex shrink-0 flex-col p-8"
                  style={{
                    width: `calc((100% - ${GAP * (perView - 1)}px) / ${perView})`,
                  }}
                  onFocus={() => setActiveItem(index)}
                >
                  <RichText
                    tagName="blockquote"
                    value={item.quote}
                    onChange={(value) => updateItem(index, { quote: value })}
                    placeholder={__('Quote…', '<text-domain>')}
                    className="text-lead flex-1"
                  />

                  <figcaption className="mt-6 flex items-center gap-4">
                    <div className="w-16 shrink-0">
                      <AttachmentImageControl
                        imageId={item.avatarId}
                        onSelect={(media) =>
                          updateItem(index, {
                            avatarId: Number(media.id) || 0,
                          })
                        }
                        onRemove={() => updateItem(index, { avatarId: 0 })}
                        height="64px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <AutoGrowingTextarea
                        value={item.author}
                        onChange={(value) =>
                          updateItem(index, { author: value })
                        }
                        placeholder={__('Name…', '<text-domain>')}
                        className="font-bold"
                      />
                      <AutoGrowingTextarea
                        value={item.role}
                        onChange={(value) => updateItem(index, { role: value })}
                        placeholder={__('Role…', '<text-domain>')}
                        className="text-small text-muted"
                      />
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          {pages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: pages }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`${__('Go to slide', '<text-domain>')} ${index + 1}`}
                  aria-current={index === page ? 'true' : undefined}
                  onClick={() => setFirstVisible(index)}
                  className="h-2 w-2 cursor-pointer rounded-full border-0 p-0"
                  style={{
                    background:
                      index === page
                        ? 'var(--color-primary)'
                        : 'var(--color-border)',
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </>
    );
  },

  save: () => null,
});
