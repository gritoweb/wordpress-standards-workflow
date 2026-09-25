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

const ALIGN = {
  left: '',
  center: 'mx-auto text-center',
};

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    const blockProps = useBlockProps();

    if (attributes.isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Section Intro preview', '<text-domain>')}
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
    const align = ALIGN[attributes.align] ?? ALIGN.left;

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Layout', '<text-domain>')} initialOpen>
            <SelectControl
              __nextHasNoMarginBottom
              label={__('Alignment', '<text-domain>')}
              value={attributes.align}
              options={[
                { label: __('Left', '<text-domain>'), value: 'left' },
                { label: __('Center', '<text-domain>'), value: 'center' },
              ]}
              onChange={(value) => setAttributes({ align: value })}
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} section-intro bg-light ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...rootEntrance.style,
          }}
        >
          <div className={`max-w-3xl ${align}`}>
            <AutoGrowingTextarea
              {...entrancePartProps(entrance, 0)}
              value={attributes.title}
              onChange={(value) => setAttributes({ title: value })}
              heading
              placeholder={__('Section title…', '<text-domain>')}
              className="heading-2"
            />
            <div {...entrancePartProps(entrance, 1)}>
              <RichText
                tagName="div"
                value={attributes.body}
                onChange={(value) => setAttributes({ body: value })}
                placeholder={__('Intro text…', '<text-domain>')}
                className="text-lead text-muted mt-4"
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
