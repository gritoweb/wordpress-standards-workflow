import { registerBlockType } from '@wordpress/blocks';
import {
  useBlockProps,
  InspectorControls,
  RichText,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { AutoGrowingTextarea } from '../components/backend/AutoGrowingTextarea.jsx';
import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
import { ButtonPair } from '../components/backend/ButtonPair.jsx';
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

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    const blockProps = useBlockProps();

    if (attributes.isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Media and Text preview', '<text-domain>')}
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
    const imageFirst = attributes.imageSide === 'left';

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Layout', '<text-domain>')} initialOpen>
            <SelectControl
              __nextHasNoMarginBottom
              label={__('Image side', '<text-domain>')}
              value={attributes.imageSide}
              options={[
                { label: __('Right', '<text-domain>'), value: 'right' },
                { label: __('Left', '<text-domain>'), value: 'left' },
              ]}
              onChange={(value) => setAttributes({ imageSide: value })}
            />
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} media-text bg-light ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...rootEntrance.style,
          }}
        >
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className={imageFirst ? 'md:order-2' : ''}>
              <AutoGrowingTextarea
                {...entrancePartProps(entrance, 0)}
                value={attributes.title}
                onChange={(value) => setAttributes({ title: value })}
                heading
                placeholder={__('Title…', '<text-domain>')}
                className="heading-2"
              />
              <div {...entrancePartProps(entrance, 1)}>
                <RichText
                  tagName="div"
                  value={attributes.body}
                  onChange={(value) => setAttributes({ body: value })}
                  placeholder={__('Text…', '<text-domain>')}
                  className="text-body text-muted mt-4"
                />
              </div>
              <div {...entrancePartProps(entrance, 2)} className="mt-8">
                <ButtonPair
                  text={attributes.ctaText}
                  link={attributes.ctaLink}
                  className="btn btn-secondary"
                  onTextChange={(value) => setAttributes({ ctaText: value })}
                  onLinkChange={(value) => setAttributes({ ctaLink: value })}
                />
              </div>
            </div>

            <div
              {...entrancePartProps(entrance, 3)}
              className={imageFirst ? 'md:order-1' : ''}
            >
              <AttachmentImageControl
                imageId={attributes.imageId}
                onSelect={(media) =>
                  setAttributes({ imageId: Number(media.id) || 0 })
                }
                onRemove={() => setAttributes({ imageId: 0 })}
                height="360px"
              />
            </div>
          </div>
        </section>
      </>
    );
  },

  save: () => null,
});
