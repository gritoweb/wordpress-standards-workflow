import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { Button, PanelBody, SelectControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
import { EditorSection } from '../components/backend/EditorSection.jsx';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import { entrancePartProps, partIndexes, resolveEntrance } from '../components/backend/entranceCanvas.js';
import { GroundSelect } from '../components/backend/GroundSelect.jsx';
import { focalCss, ImagePositionControl } from '../components/backend/ImagePositionControl.jsx';
import { InlineHeading } from '../components/backend/InlineField.jsx';
import { ParagraphsField } from '../components/backend/ParagraphsField.jsx';
import { formOptions } from './editor-forms.js';
import { FormPreview } from './FormPreview.jsx';
import { useGravityForms } from './useGravityForms.js';
import previewImage from './preview.svg';
import metadata from './block.json';

registerBlockType(metadata, {
  edit({ attributes, setAttributes, isSelected, clientId }) {
    const blockProps = useBlockProps();
    const { isPreview, heading, intro, ground, formId, formShortcode, imageId, imageUrl, mediaPosition, imagePosition } =
      attributes;
    const gravity = useGravityForms(Number(formId) || 0);

    if (isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Contact Form preview', '__TEXT_DOMAIN__')}
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
          />
        </div>
      );
    }

    const entrance = resolveEntrance(attributes.entrance, metadata.attributes.entrance?.default);
    const hasForm = formId > 0 || Boolean(formShortcode);
    const part = partIndexes({
      heading: Boolean(heading) || isSelected || !(intro || hasForm),
      intro: Boolean(intro) || isSelected,
      form: true,
      media: true,
    });

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Form', '__TEXT_DOMAIN__')} initialOpen={false}>
            {gravity.status !== 'unavailable' && (
              <SelectControl
                label={__('Gravity Forms form', '__TEXT_DOMAIN__')}
                help={
                  gravity.status === 'loading'
                    ? __('Loading your forms.', '__TEXT_DOMAIN__')
                    : __('Choose the form to show. None shows the shortcode below instead.', '__TEXT_DOMAIN__')
                }
                value={Number(formId) || 0}
                options={formOptions(gravity.forms, Number(formId) || 0)}
                onChange={(value) => setAttributes({ formId: Math.max(0, parseInt(value, 10)) || 0 })}
              />
            )}
            {gravity.status === 'unavailable' && formId > 0 && (
              <>
                <p style={{ margin: '0 0 8px' }}>
                  {__(
                    'A form is saved, but the form list can’t load. It needs the Gravity Forms REST API, and a login that can edit forms.',
                    '__TEXT_DOMAIN__',
                  )}
                </p>
                <Button variant="secondary" style={{ marginBottom: '16px' }} onClick={() => setAttributes({ formId: 0 })}>
                  {__('Use a shortcode instead', '__TEXT_DOMAIN__')}
                </Button>
              </>
            )}
            {(gravity.status === 'unavailable' || !formId) && (
              <TextControl
                label={__('Form shortcode', '__TEXT_DOMAIN__')}
                help={__('Any form plugin’s shortcode. Used when no Gravity Forms form is chosen, or Gravity Forms is not active.', '__TEXT_DOMAIN__')}
                value={formShortcode}
                onChange={(value) => setAttributes({ formShortcode: value })}
              />
            )}
          </PanelBody>

          <PanelBody title={__('Image', '__TEXT_DOMAIN__')} initialOpen={false}>
            <ImagePositionControl
              label={__('Focal point', '__TEXT_DOMAIN__')}
              value={imagePosition}
              onChange={(value) => setAttributes({ imagePosition: value })}
            />
          </PanelBody>

          <PanelBody title={__('Section', '__TEXT_DOMAIN__')} initialOpen={false}>
            <GroundSelect value={ground} onChange={(value) => setAttributes({ ground: value })} />
            <SelectControl
              label={__('Image side', '__TEXT_DOMAIN__')}
              value={mediaPosition}
              options={[
                { label: __('Right', '__TEXT_DOMAIN__'), value: 'right' },
                { label: __('Left', '__TEXT_DOMAIN__'), value: 'left' },
              ]}
              onChange={(value) => setAttributes({ mediaPosition: value })}
            />
          </PanelBody>
        </InspectorControls>

        <EntranceControl attributes={attributes} setAttributes={setAttributes} clientId={clientId} />

        <EditorSection slug="contact-form" ground={ground} entrance={entrance} data-media-position={mediaPosition}>
          <div className="contact-form__grid grid gap-8 xl:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-8">
              {part.heading !== null && (
                <InlineHeading
                  {...entrancePartProps(entrance, part.heading)}
                  tier="statement"
                  headingClass="contact-form__heading heading-1"
                  label={__('Heading', '__TEXT_DOMAIN__')}
                  value={heading}
                  placeholder={__('Write a heading', '__TEXT_DOMAIN__')}
                  onChange={(value) => setAttributes({ heading: value })}
                />
              )}

              {part.intro !== null && (
                <div {...entrancePartProps(entrance, part.intro)}>
                  <ParagraphsField
                    aria-label={__('Intro', '__TEXT_DOMAIN__')}
                    value={intro || ''}
                    onChange={(value) => setAttributes({ intro: value })}
                    placeholder={__('Write the introduction', '__TEXT_DOMAIN__')}
                    className="contact-form__intro p-1 text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                  />
                </div>
              )}

              <FormPreview
                formId={Number(formId) || 0}
                formShortcode={formShortcode}
                gravity={gravity}
                partProps={entrancePartProps(entrance, part.form)}
              />
            </div>

            <div
              {...entrancePartProps(entrance, part.media)}
              className={`grid min-w-0 overflow-hidden rounded-[var(--radius-card)] ${mediaPosition === 'left' ? 'xl:order-first' : ''}`}
              style={{ aspectRatio: '4 / 5', maxHeight: '28rem', ...entrancePartProps(entrance, part.media).style }}
              data-media-position={mediaPosition}
            >
              <AttachmentImageControl
                imageId={imageId}
                imageUrl={imageUrl}
                label={__('Section image (1200×1500)', '__TEXT_DOMAIN__')}
                height="100%"
                objectFit="cover"
                objectPosition={focalCss(imagePosition)}
                onSelect={(media) => setAttributes({ imageId: Number(media.id) || 0, imageUrl: '' })}
                onRemove={() => setAttributes({ imageId: 0, imageUrl: '' })}
              />
            </div>
          </div>
        </EditorSection>
      </>
    );
  },

  save: () => null,
});
