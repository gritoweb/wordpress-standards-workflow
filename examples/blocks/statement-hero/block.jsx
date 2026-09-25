import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
import { EditorSection } from '../components/backend/EditorSection.jsx';
import { EDITOR_TYPE } from '../components/backend/editorCanvas.js';
import { entrancePartProps, partIndexes, resolveEntrance } from '../components/backend/entranceCanvas.js';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import { GroundSelect } from '../components/backend/GroundSelect.jsx';
import wordmark from '../../images/logo.svg';
import previewImage from './preview.svg';
import metadata from './block.json';

const MEDIA_OPTIONS = [
  { label: __('Logo', '__TEXT_DOMAIN__'), value: 'logo' },
  { label: __('Image', '__TEXT_DOMAIN__'), value: 'image' },
  { label: __('None', '__TEXT_DOMAIN__'), value: 'none' },
];

registerBlockType(metadata, {
  edit({ attributes, setAttributes, isSelected, clientId }) {
    const blockProps = useBlockProps();
    const { isPreview, ground, media, imageId, imageUrl, heading, showScrollCue } = attributes;
    const entrance = resolveEntrance(attributes.entrance, metadata.attributes.entrance?.default);

    if (isPreview) {
      return (
        <div {...blockProps}>
          <div
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <img
              src={previewImage}
              alt={__('Statement hero preview', '__TEXT_DOMAIN__')}
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

    // The statement is the block's main field, so it always shows; the media
    // and the cue draw only as the block renders them, and an image frame
    // also shows while the block is selected, so there is a place to pick one.
    const part = partIndexes({
      media: media === 'logo' || (media === 'image' && (Boolean(imageId || imageUrl) || isSelected)),
      heading: true,
      cue: Boolean(showScrollCue),
    });

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Media', '__TEXT_DOMAIN__')} initialOpen={false}>
            <SelectControl
              label={__('Media', '__TEXT_DOMAIN__')}
              value={media}
              options={MEDIA_OPTIONS}
              onChange={(value) => setAttributes({ media: value })}
            />
          </PanelBody>

          <PanelBody title={__('Layout', '__TEXT_DOMAIN__')} initialOpen={false}>
            <ToggleControl
              label={__('Show scroll cue', '__TEXT_DOMAIN__')}
              checked={!!showScrollCue}
              onChange={(value) => setAttributes({ showScrollCue: value })}
              help={__('Show a scroll cue at the foot of the panel.', '__TEXT_DOMAIN__')}
            />
          </PanelBody>

          <PanelBody title={__('Section', '__TEXT_DOMAIN__')} initialOpen={false}>
            <GroundSelect value={ground} onChange={(value) => setAttributes({ ground: value })} />
          </PanelBody>
        </InspectorControls>
        <EntranceControl attributes={attributes} setAttributes={setAttributes} clientId={clientId} />

        <EditorSection
          slug="statement-hero"
          ground={ground}
          entrance={entrance}
          className="relative flex min-h-96 flex-col"
          innerClassName="flex flex-1 flex-col items-center"
        >
          {media === 'logo' && (
            <img
              src={wordmark}
              alt={__('Site logo', '__TEXT_DOMAIN__')}
              className="statement-hero__logo mt-8 block h-auto w-full max-w-md"
              {...entrancePartProps(entrance, part.media)}
            />
          )}

          {part.media !== null && media === 'image' && (
            <div className="statement-hero__media mt-8 w-full max-w-2xl" {...entrancePartProps(entrance, part.media)}>
              <AttachmentImageControl
                imageId={imageId}
                imageUrl={imageUrl}
                label={__('Image (1920×1080)', '__TEXT_DOMAIN__')}
                onSelect={(selected) => setAttributes({ imageId: Number(selected.id) || 0, imageUrl: '' })}
                onRemove={() => setAttributes({ imageId: 0, imageUrl: '' })}
                height="16rem"
              />
            </div>
          )}

          <RichText
            tagName="h2"
            aria-label={__('Statement', '__TEXT_DOMAIN__')}
            className={`statement-hero__heading ${EDITOR_TYPE.statement} mx-auto mt-8 w-full max-w-3xl text-center`}
            value={heading}
            onChange={(value) => setAttributes({ heading: value })}
            placeholder={__('Write the opening statement.', '__TEXT_DOMAIN__')}
            {...entrancePartProps(entrance, part.heading)}
          />

          {part.cue !== null && (
            <span
              className="statement-hero__cue mt-auto block h-11 w-11"
              aria-hidden="true"
              {...entrancePartProps(entrance, part.cue)}
            />
          )}
        </EditorSection>
      </>
    );
  },

  save: () => null,
});
