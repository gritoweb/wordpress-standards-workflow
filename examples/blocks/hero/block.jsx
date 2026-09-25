import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, RangeControl, SelectControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
import { EditorSection } from '../components/backend/EditorSection.jsx';
import { clamp } from '../components/backend/editorCanvas.js';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import { entrancePartProps, partIndexes, resolveEntrance } from '../components/backend/entranceCanvas.js';
import { GroundSelect } from '../components/backend/GroundSelect.jsx';
import { focalCss, ImagePositionControl } from '../components/backend/ImagePositionControl.jsx';
import { InlineField, InlineHeading } from '../components/backend/InlineField.jsx';
import { ItemList } from '../components/backend/ItemList.jsx';
import { ParagraphsField } from '../components/backend/ParagraphsField.jsx';
import { useAttachmentUrls } from '../components/backend/useAttachmentUrls.js';
import { useRepeater } from '../components/backend/useRepeater.js';
import {
  createEmptySlide,
  getSlideImageId,
  getSlideImagePosition,
  getSlideImageUrl,
  getSlideMobileImageId,
  getSlideText,
} from './editor-slides.js';
import previewImage from './preview.svg';
import metadata from './block.json';

const DELAY_MIN = 1000;
const DELAY_MAX = 20000;
const DELAY_DEFAULT = 5000;
const TRANSITION_DURATION_MIN = 0;
const TRANSITION_DURATION_MAX = 2000;
const TRANSITION_DURATION_DEFAULT = 500;

registerBlockType(metadata, {
  edit({ attributes, setAttributes, isSelected, clientId }) {
    const blockProps = useBlockProps();
    const { isPreview, eyebrow, heading, slides, ground } = attributes;
    const repeater = useRepeater({
      items: slides,
      setItems: (next) => setAttributes({ slides: next }),
      blank: () => createEmptySlide(),
    });
    const safeSlides = repeater.items;
    const attachmentUrls = useAttachmentUrls(safeSlides.map(getSlideImageId));

    if (isPreview) {
      return (
        <div {...blockProps}>
          <div
            style={{
              width: '100%',
              aspectRatio: '5 / 3',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <img
              src={previewImage}
              alt={__('Hero preview', '__TEXT_DOMAIN__')}
              width={800}
              height={480}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        </div>
      );
    }

    const active = repeater.activeItem;
    const entrance = resolveEntrance(attributes.entrance, metadata.attributes.entrance?.default);
    // Reading order, the same as the front end: the layout swaps the first two.
    const eyebrowFirst = attributes.layout !== 'eyebrow-below';
    const hasActiveSlide = safeSlides.length > 0;
    const activeImageId = getSlideImageId(active);
    const activeEyebrow = getSlideText(active, 'eyebrow', eyebrow);
    const activeHeading = getSlideText(active, 'heading', heading);

    // Empty body/caption prompts are an editing affordance, not published
    // content: they only belong on the canvas while an editor is looking.
    const bodyCaptionPermitted = attributes.layout !== 'no-body';
    const showBody = bodyCaptionPermitted && (Boolean(attributes.body) || isSelected);
    const showCaption = bodyCaptionPermitted && (Boolean(attributes.caption) || isSelected);

    // A part that doesn't draw takes no index, the same as hero.blade.php's
    // own $partIndex: a fixed 0 to 4 would leave a gap in the stagger the
    // moment any part is missing.
    const drawn = {
      eyebrow: Boolean(activeEyebrow) || isSelected,
      heading: true,
      body: showBody,
      caption: showCaption,
      slides: hasActiveSlide,
    };
    const order = eyebrowFirst ? ['eyebrow', 'heading'] : ['heading', 'eyebrow'];
    const part = partIndexes({
      [order[0]]: drawn[order[0]],
      [order[1]]: drawn[order[1]],
      body: drawn.body,
      caption: drawn.caption,
      slides: drawn.slides,
    });

    // With no slides the page publishes the top-level copy; edits go there,
    // and the first slide takes that copy over so nothing disappears.
    const setText = (key, value) =>
      hasActiveSlide ? repeater.update(repeater.active, { [key]: value }) : setAttributes({ [key]: value });

    const addSlide = () =>
      hasActiveSlide
        ? repeater.add()
        : setAttributes({ slides: [{ ...createEmptySlide(), eyebrow: activeEyebrow, heading: activeHeading }] });

    const eyebrowField = part.eyebrow !== null && (
      <InlineField
        {...entrancePartProps(entrance, part.eyebrow)}
        label={__('Eyebrow', '__TEXT_DOMAIN__')}
        value={activeEyebrow}
        placeholder={__('Add an eyebrow', '__TEXT_DOMAIN__')}
        onChange={(value) => setText('eyebrow', value)}
        className="hero__eyebrow font-normal uppercase"
      />
    );

    const headingField = (
      <InlineHeading
        {...entrancePartProps(entrance, part.heading)}
        tier="statement"
        headingClass="hero__heading heading-1"
        label={__('Heading', '__TEXT_DOMAIN__')}
        value={activeHeading}
        placeholder={__('Add a heading', '__TEXT_DOMAIN__')}
        onChange={(value) => setText('heading', value)}
      />
    );

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Slides', '__TEXT_DOMAIN__')} initialOpen={false}>
            <ItemList
              items={safeSlides}
              activeItem={repeater.active}
              setActiveItem={repeater.setActive}
              onAdd={addSlide}
              onRemove={repeater.remove}
              onMove={repeater.move}
              getThumb={(slide) => attachmentUrls[getSlideImageId(slide)] || getSlideImageUrl(slide)}
              addButtonLabel={__('+ Add slide', '__TEXT_DOMAIN__')}
              itemLabelPrefix={__('Slide', '__TEXT_DOMAIN__')}
              removeConfirm={__('Remove this slide?', '__TEXT_DOMAIN__')}
            />

            {hasActiveSlide && (
              <div style={{ marginTop: '16px' }}>
                <AttachmentImageControl
                  imageId={getSlideMobileImageId(active)}
                  label={__('Mobile image (800×1000)', '__TEXT_DOMAIN__')}
                  emptyLabel={__('Add mobile image', '__TEXT_DOMAIN__')}
                  replaceLabel={__('Replace mobile image', '__TEXT_DOMAIN__')}
                  removeLabel={__('Remove mobile image', '__TEXT_DOMAIN__')}
                  height="140px"
                  noStylesheet
                  onSelect={(media) => repeater.update(repeater.active, { mobileImageId: Number(media.id) || 0 })}
                  onRemove={() => repeater.update(repeater.active, { mobileImageId: 0 })}
                />

                <ImagePositionControl
                  label={__('Focal point', '__TEXT_DOMAIN__')}
                  value={getSlideImagePosition(active)}
                  onChange={(imagePosition) => repeater.update(repeater.active, { imagePosition })}
                />
              </div>
            )}
          </PanelBody>

          <PanelBody title={__('Section', '__TEXT_DOMAIN__')} initialOpen={false}>
            <GroundSelect value={ground} onChange={(value) => setAttributes({ ground: value })} />
          </PanelBody>

          <PanelBody title={__('Motion', '__TEXT_DOMAIN__')} initialOpen={false}>
            <SelectControl
              label={__('Transition', '__TEXT_DOMAIN__')}
              value={attributes.transition || 'fade'}
              options={[
                { label: __('Fade', '__TEXT_DOMAIN__'), value: 'fade' },
                { label: __('Slide', '__TEXT_DOMAIN__'), value: 'slide' },
              ]}
              onChange={(transition) => setAttributes({ transition })}
            />
            <RangeControl
              label={__('Transition (ms)', '__TEXT_DOMAIN__')}
              help={__('How long the fade or slide takes.', '__TEXT_DOMAIN__')}
              value={clamp(
                attributes.transitionDuration,
                TRANSITION_DURATION_MIN,
                TRANSITION_DURATION_MAX,
                TRANSITION_DURATION_DEFAULT,
              )}
              min={TRANSITION_DURATION_MIN}
              max={TRANSITION_DURATION_MAX}
              step={50}
              onChange={(value) =>
                setAttributes({
                  transitionDuration: clamp(
                    value,
                    TRANSITION_DURATION_MIN,
                    TRANSITION_DURATION_MAX,
                    TRANSITION_DURATION_DEFAULT,
                  ),
                })
              }
            />
            <ToggleControl
              label={__('Loop', '__TEXT_DOMAIN__')}
              checked={attributes.loop !== false}
              onChange={(loop) => setAttributes({ loop })}
            />
            <ToggleControl
              label={__('Autoplay', '__TEXT_DOMAIN__')}
              checked={attributes.autoplay === true}
              onChange={(autoplay) => setAttributes({ autoplay })}
            />
            {attributes.autoplay === true && (
              <RangeControl
                label={__('Delay (ms)', '__TEXT_DOMAIN__')}
                value={clamp(
                  attributes.autoplayDelay,
                  DELAY_MIN,
                  DELAY_MAX,
                  DELAY_DEFAULT,
                )}
                min={DELAY_MIN}
                max={DELAY_MAX}
                step={500}
                onChange={(value) =>
                  setAttributes({
                    autoplayDelay: clamp(
                      value,
                      DELAY_MIN,
                      DELAY_MAX,
                      DELAY_DEFAULT,
                    ),
                  })
                }
              />
            )}
          </PanelBody>
        </InspectorControls>

        <EntranceControl attributes={attributes} setAttributes={setAttributes} clientId={clientId} />

        <EditorSection slug="hero" ground={ground} entrance={entrance} data-active-slide={repeater.active}>
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-5">
            <div className="min-w-0 lg:w-[39.824%] lg:shrink-0">
              <div className="max-w-[30.4375rem]">
                {eyebrowFirst ? (
                  <>
                    {eyebrowField}
                    {headingField}
                  </>
                ) : (
                  <>
                    {headingField}
                    {eyebrowField}
                  </>
                )}

                {part.body !== null && (
                  <div {...entrancePartProps(entrance, part.body)}>
                    <ParagraphsField
                      aria-label={__('Body', '__TEXT_DOMAIN__')}
                      value={attributes.body || ''}
                      onChange={(value) => setAttributes({ body: value })}
                      placeholder={__('Write the body copy', '__TEXT_DOMAIN__')}
                      className="hero__body mt-6 p-1 text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                    />
                  </div>
                )}

                {part.caption !== null && (
                  <InlineField
                    {...entrancePartProps(entrance, part.caption)}
                    label={__('Caption', '__TEXT_DOMAIN__')}
                    value={attributes.caption}
                    placeholder={__('Add a caption', '__TEXT_DOMAIN__')}
                    onChange={(value) => setAttributes({ caption: value })}
                    className="hero__caption mt-8 uppercase"
                  />
                )}
              </div>
            </div>

            <div className="min-w-0 lg:flex-1">
              {hasActiveSlide ? (
                <div
                  className="h-[22rem] overflow-hidden rounded-[var(--radius-card)] lg:h-[28rem]"
                  {...entrancePartProps(entrance, part.slides)}
                >
                  <AttachmentImageControl
                    imageId={activeImageId}
                    imageUrl={getSlideImageUrl(active)}
                    label={__('Slide image (1920×1080)', '__TEXT_DOMAIN__')}
                    height="100%"
                    objectFit="cover"
                    objectPosition={focalCss(getSlideImagePosition(active))}
                    onSelect={(media) =>
                      repeater.update(repeater.active, { slideImageId: Number(media.id) || 0, slideImageUrl: '' })
                    }
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="cursor-pointer rounded-sm border border-current px-4 py-2 text-small font-medium focus-visible:ring-1 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:outline-0"
                  onClick={addSlide}
                >
                  {__('Add slide', '__TEXT_DOMAIN__')}
                </button>
              )}
            </div>
          </div>
        </EditorSection>
      </>
    );
  },

  save: () => null,
});
