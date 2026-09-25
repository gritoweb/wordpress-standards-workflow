import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { ActionEditor } from '../components/backend/ActionEditor.jsx';
import { CtaPreview } from '../components/backend/CtaPreview.jsx';
import { DividerControl } from '../components/backend/DividerControl.jsx';
import { EditorSection } from '../components/backend/EditorSection.jsx';
import { fieldLabel } from '../components/backend/editorCanvas.js';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import {
  entrancePartProps,
  partIndexes,
  resolveEntrance,
} from '../components/backend/entranceCanvas.js';
import { isLightGround } from '../components/backend/ground.js';
import { GroundSelect } from '../components/backend/GroundSelect.jsx';
import { InlineHeading } from '../components/backend/InlineField.jsx';
import { ItemList } from '../components/backend/ItemList.jsx';
import { ParagraphsField } from '../components/backend/ParagraphsField.jsx';
import { itemKey, useRepeater } from '../components/backend/useRepeater.js';
import previewImage from './preview.svg';
import metadata from './block.json';

// Mirrors block.php: an entry needs a question and answer text to render.
const hasText = (html) => Boolean((html || '').replace(/<[^>]*>/g, '').trim());
const isRenderable = (entry) =>
  Boolean(entry.heading?.trim()) && hasText(entry.body);

registerBlockType(metadata, {
  edit({ attributes, setAttributes, isSelected, clientId }) {
    const blockProps = useBlockProps();
    const {
      isPreview,
      heading,
      intro,
      ground,
      sectionDivider,
      ctaText,
      ctaLink,
      ctaIcon,
      ctaIconPosition,
    } = attributes;
    const repeater = useRepeater({
      items: attributes.items,
      setItems: (items) => setAttributes({ items }),
      blank: () => ({ heading: '', body: '' }),
    });

    if (isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('FAQ preview', '__TEXT_DOMAIN__')}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      );
    }

    const entrance = resolveEntrance(
      attributes.entrance,
      metadata.attributes.entrance?.default,
    );
    const onDark = !isLightGround(ground);
    const hasCta = Boolean(ctaText || ctaLink?.url);
    const showHeading =
      Boolean(heading) ||
      isSelected ||
      !(intro || repeater.items.length || hasCta);
    const part = partIndexes({
      heading: showHeading,
      intro: hasText(intro) || isSelected,
      items: repeater.items.some(isRenderable),
      cta: hasCta || isSelected,
    });

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Questions', '__TEXT_DOMAIN__')} initialOpen={false}>
            <ItemList
              items={repeater.items}
              activeItem={repeater.active}
              setActiveItem={repeater.setActive}
              onAdd={repeater.add}
              onRemove={repeater.remove}
              onMove={repeater.move}
              getLabel={(entry) => entry.heading}
              itemLabelPrefix={__('Question', '__TEXT_DOMAIN__')}
              addButtonLabel={__('+ Add question', '__TEXT_DOMAIN__')}
              removeConfirm={__('Remove this question?', '__TEXT_DOMAIN__')}
              minItems={0}
            />
          </PanelBody>

          <PanelBody title={__('Section', '__TEXT_DOMAIN__')} initialOpen={false}>
            <GroundSelect
              value={ground}
              onChange={(value) => setAttributes({ ground: value })}
            />
            <DividerControl
              value={sectionDivider}
              onChange={(value) => setAttributes({ sectionDivider: value })}
            />
          </PanelBody>

        </InspectorControls>

        <EntranceControl
          attributes={attributes}
          setAttributes={setAttributes}
          clientId={clientId}
        />

        <EditorSection
          slug="faq"
          ground={ground}
          sectionDivider={sectionDivider}
          entrance={entrance}
        >
          <div className="flex flex-col gap-6">
            {showHeading && (
              <InlineHeading
                {...entrancePartProps(entrance, part.heading)}
                tier="section"
                headingClass="heading-2"
                label={__('Heading', '__TEXT_DOMAIN__')}
                value={heading}
                onDark={onDark}
                placeholder={__('Write a heading', '__TEXT_DOMAIN__')}
                onChange={(value) => setAttributes({ heading: value })}
              />
            )}

            {(intro || isSelected) && (
              <div {...entrancePartProps(entrance, part.intro)}>
                <ParagraphsField
                  aria-label={__('Introduction', '__TEXT_DOMAIN__')}
                  value={intro || ''}
                  onChange={(value) => setAttributes({ intro: value })}
                  placeholder={__('Write the introduction', '__TEXT_DOMAIN__')}
                  className="p-1 text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                />
              </div>
            )}

            {repeater.items.length === 0 ? (
              <p className="m-0 p-1 text-[color:var(--color-ink)]/70">
                {__('Add questions in the Questions panel.', '__TEXT_DOMAIN__')}
              </p>
            ) : (
              <div
                {...entrancePartProps(entrance, part.items)}
                className="border-t border-[color:var(--color-ink)]/25"
              >
                {repeater.items.map((entry, index) => (
                  <div
                    key={itemKey(entry, index)}
                    data-entry-index={index}
                    className="flex flex-col gap-2 border-b border-[color:var(--color-ink)]/25 py-5"
                  >
                    <InlineHeading
                      tier="entry"
                      headingClass="heading-5"
                      label={__('Question', '__TEXT_DOMAIN__')}
                      position={index}
                      value={entry.heading}
                      onDark={onDark}
                      placeholder={__('Write a question', '__TEXT_DOMAIN__')}
                      onChange={(value) =>
                        repeater.update(index, { heading: value })
                      }
                    />
                    <ParagraphsField
                      aria-label={fieldLabel(
                        __('Answer', '__TEXT_DOMAIN__'),
                        index,
                      )}
                      value={entry.body || ''}
                      onChange={(value) =>
                        repeater.update(index, { body: value })
                      }
                      placeholder={__('Write the answer', '__TEXT_DOMAIN__')}
                      className="p-1 text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                    />
                  </div>
                ))}
              </div>
            )}

            <div {...entrancePartProps(entrance, part.cta)}>
              <CtaPreview
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
                  onIconPositionChange={(value) =>
                  setAttributes({ ctaIconPosition: value })
                  }
                />
              )}
            </div>
          </div>
        </EditorSection>
      </>
    );
  },

  save: () => null,
});
