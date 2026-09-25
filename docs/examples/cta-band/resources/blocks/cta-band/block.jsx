import { registerBlockType } from '@wordpress/blocks';
import {
  useBlockProps,
  InspectorControls,
  RichText,
} from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { AutoGrowingTextarea } from '../components/backend/AutoGrowingTextarea.jsx';
import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
import { ButtonPair } from '../components/backend/ButtonPair.jsx';
import {
  ImagePositionControl,
  focalCss,
} from '../components/backend/ImagePositionControl.jsx';
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

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    const blockProps = useBlockProps();
    const bgUrl = useAttachmentUrls([Number(attributes.bgImageId) || 0])[
      Number(attributes.bgImageId)
    ];

    if (attributes.isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('CTA Band preview', '<text-domain>')}
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

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Background Media', '<text-domain>')} initialOpen>
            <AttachmentImageControl
              imageId={attributes.bgImageId}
              onSelect={(media) =>
                setAttributes({ bgImageId: Number(media.id) || 0 })
              }
              onRemove={() => setAttributes({ bgImageId: 0 })}
              height="140px"
              noStylesheet
            />
            <ImagePositionControl
              label={__('Focal point', '<text-domain>')}
              value={attributes.bgImagePosition}
              onChange={(value) => setAttributes({ bgImagePosition: value })}
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} cta-band bg-ink text-light relative isolate overflow-hidden ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...rootEntrance.style,
          }}
        >
          {/* Passive background preview: picked, replaced and removed in the sidebar. */}
          {bgUrl && (
            <img
              src={bgUrl}
              alt=""
              className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-40"
              style={{ objectPosition: focalCss(attributes.bgImagePosition) }}
            />
          )}

          <div className="mx-auto max-w-2xl text-center">
            <AutoGrowingTextarea
              {...entrancePartProps(entrance, 0)}
              value={attributes.title}
              onChange={(value) => setAttributes({ title: value })}
              heading
              placeholder={__('Call to action…', '<text-domain>')}
              className="heading-2 text-light text-center"
            />
            <div {...entrancePartProps(entrance, 1)}>
              <RichText
                tagName="div"
                value={attributes.body}
                onChange={(value) => setAttributes({ body: value })}
                placeholder={__('Supporting text…', '<text-domain>')}
                className="text-lead text-light mt-4"
              />
            </div>
            <div {...entrancePartProps(entrance, 2)} className="mt-8">
              <ButtonPair
                text={attributes.ctaText}
                link={attributes.ctaLink}
                onTextChange={(value) => setAttributes({ ctaText: value })}
                onLinkChange={(value) => setAttributes({ ctaLink: value })}
              />
            </div>
          </div>
        </section>
      </>
    );
  },

  save: () => null,
});
