import { registerBlockType } from '@wordpress/blocks';
import {
  useBlockProps,
  InspectorControls,
  RichText,
} from '@wordpress/block-editor';
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
            alt={__('Hero preview', '<text-domain>')}
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} hero bg-surface ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...rootEntrance.style,
          }}
        >
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <AutoGrowingTextarea
                {...entrancePartProps(entrance, 0)}
                value={attributes.title}
                onChange={(value) => setAttributes({ title: value })}
                heading
                placeholder={__('Hero title…', '<text-domain>')}
                className="heading-1"
              />
              <div {...entrancePartProps(entrance, 1)}>
                <RichText
                  tagName="div"
                  value={attributes.body}
                  onChange={(value) => setAttributes({ body: value })}
                  placeholder={__('Supporting text…', '<text-domain>')}
                  className="text-lead text-muted mt-6"
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

            <div {...entrancePartProps(entrance, 3)}>
              <AttachmentImageControl
                imageId={attributes.imageId}
                onSelect={(media) =>
                  setAttributes({ imageId: Number(media.id) || 0 })
                }
                onRemove={() => setAttributes({ imageId: 0 })}
                height="420px"
              />
            </div>
          </div>
        </section>
      </>
    );
  },

  save: () => null,
});
