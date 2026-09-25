import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { ActionEditor } from '../components/backend/ActionEditor.jsx';
import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
import { CtaPreview } from '../components/backend/CtaPreview.jsx';
import { DividerControl } from '../components/backend/DividerControl.jsx';
import { EditorSection } from '../components/backend/EditorSection.jsx';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import { entrancePartProps, partIndexes, resolveEntrance } from '../components/backend/entranceCanvas.js';
import { GroundSelect } from '../components/backend/GroundSelect.jsx';
import { InlineField, InlineHeading } from '../components/backend/InlineField.jsx';
import { ItemList } from '../components/backend/ItemList.jsx';
import { ParagraphsField } from '../components/backend/ParagraphsField.jsx';
import { itemKey, useRepeater } from '../components/backend/useRepeater.js';
import previewImage from './preview.svg';
import metadata from './block.json';

registerBlockType(metadata, {
  edit({ attributes, setAttributes, isSelected, clientId }) {
    const blockProps = useBlockProps();
    const { isPreview, heading, body, imageId, imageUrl, ground, sectionDivider, ctaText, ctaLink, ctaIcon, ctaIconPosition } = attributes;
    const repeater = useRepeater({ items: attributes.items, setItems: (items) => setAttributes({ items }) });

    if (isPreview) {
      return (
        <div {...blockProps}>
          <img src={previewImage} alt={__('Conformance pass preview', '__TEXT_DOMAIN__')} style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      );
    }

    const entrance = resolveEntrance(attributes.entrance, metadata.attributes.entrance?.default);
    const hasCta = Boolean(ctaText || ctaLink?.url);
    const showHeading = Boolean(heading) || isSelected || !(body || imageId || repeater.items.length || hasCta);
    const part = partIndexes({
      heading: showHeading,
      body: Boolean(body) || isSelected,
      image: true,
      items: repeater.items.length > 0,
      cta: hasCta || isSelected,
    });

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Items', '__TEXT_DOMAIN__')} initialOpen={false}>
            <ItemList
              items={repeater.items}
              activeItem={repeater.active}
              setActiveItem={repeater.setActive}
              onAdd={repeater.add}
              onRemove={repeater.remove}
              onMove={repeater.move}
              getLabel={(entry) => entry.heading}
              itemLabelPrefix={__('Item', '__TEXT_DOMAIN__')}
              addButtonLabel={__('Add item', '__TEXT_DOMAIN__')}
              removeConfirm={__('Remove this item?', '__TEXT_DOMAIN__')}
              minItems={0}
              selectable={false}
            />
          </PanelBody>

          <PanelBody title={__('Section', '__TEXT_DOMAIN__')} initialOpen={false}>
            <GroundSelect value={ground} onChange={(value) => setAttributes({ ground: value })} />
            <DividerControl value={sectionDivider} onChange={(value) => setAttributes({ sectionDivider: value })} />
          </PanelBody>

        </InspectorControls>

        <EntranceControl attributes={attributes} setAttributes={setAttributes} clientId={clientId} />

        <EditorSection slug="conformance-pass" ground={ground} sectionDivider={sectionDivider} entrance={entrance}>
          {showHeading && (
            <InlineHeading
              {...entrancePartProps(entrance, part.heading)}
              tier="section"
              headingClass="heading-2"
              label={__('Heading', '__TEXT_DOMAIN__')}
              value={heading}
              placeholder={__('Write a heading', '__TEXT_DOMAIN__')}
              onChange={(value) => setAttributes({ heading: value })}
            />
          )}

          {(body || isSelected) && (
            <ParagraphsField
              aria-label={__('Body', '__TEXT_DOMAIN__')}
              value={body || ''}
              onChange={(value) => setAttributes({ body: value })}
              placeholder={__('Write the introduction', '__TEXT_DOMAIN__')}
              className="mt-5 p-1 text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
            />
          )}

          <div {...entrancePartProps(entrance, part.image)} className="mt-6 max-h-[28rem] overflow-hidden">
            <AttachmentImageControl
              imageId={imageId}
              imageUrl={imageUrl}
              label={__('Image (recommended 1200×800)', '__TEXT_DOMAIN__')}
              onSelect={(media) => setAttributes({ imageId: Number(media.id) || 0, imageUrl: '' })}
              onRemove={() => setAttributes({ imageId: 0, imageUrl: '' })}
            />
          </div>

          {repeater.items.length > 0 && (
            <div {...entrancePartProps(entrance, part.items)} className="mt-6">
              {repeater.items.map((entry, index) => (
                <div key={itemKey(entry, index)} data-entry-index={index}>
                  {(entry.heading || isSelected) && (
                    <InlineField
                      label={__('Item heading', '__TEXT_DOMAIN__')}
                      position={index}
                      value={entry.heading}
                      placeholder={__('Write an item heading', '__TEXT_DOMAIN__')}
                      onChange={(value) => repeater.update(index, { heading: value })}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div {...entrancePartProps(entrance, part.cta)}>
            <CtaPreview
              className="mt-6"
              text={ctaText}
              link={ctaLink}
              icon={ctaIcon}
              iconPosition={ctaIconPosition}
              ground={ground}
              isSelected={isSelected}
            />
            {/* The button is edited on the canvas, never in the sidebar. */}
            {isSelected && (
              <ActionEditor
                groupLabel={__('Button editing', '__TEXT_DOMAIN__')}
                label={__('Button label', '__TEXT_DOMAIN__')}
                linkLabel={__('Button destination', '__TEXT_DOMAIN__')}
                text={ctaText}
                link={ctaLink}
                icon={ctaIcon}
                iconPosition={ctaIconPosition}
                onTextChange={(value) => setAttributes({ ctaText: value })}
                onLinkChange={(value) => setAttributes({ ctaLink: value })}
                onIconChange={(value) => setAttributes({ ctaIcon: value })}
                onIconPositionChange={(value) => setAttributes({ ctaIconPosition: value })}
              />
            )}
          </div>
        </EditorSection>
      </>
    );
  },

  save: () => null,
});
