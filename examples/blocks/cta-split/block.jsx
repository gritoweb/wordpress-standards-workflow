import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { ActionEditor } from '../components/backend/ActionEditor.jsx';
import { CtaPreview } from '../components/backend/CtaPreview.jsx';
import { DividerControl } from '../components/backend/DividerControl.jsx';
import { EditorSection } from '../components/backend/EditorSection.jsx';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import { entrancePartProps, partIndexes, resolveEntrance } from '../components/backend/entranceCanvas.js';
import { GroundSelect } from '../components/backend/GroundSelect.jsx';
import { InlineHeading } from '../components/backend/InlineField.jsx';
import { ParagraphsField } from '../components/backend/ParagraphsField.jsx';
import previewImage from './preview.svg';
import metadata from './block.json';

registerBlockType(metadata, {
  edit({ attributes, setAttributes, isSelected, clientId }) {
    const blockProps = useBlockProps();
    const { isPreview, heading, body, ground, sectionDivider, ctaText, ctaLink, ctaIcon, ctaIconPosition } = attributes;

    if (isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('CTA Split preview', '__TEXT_DOMAIN__')}
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
          />
        </div>
      );
    }

    const entrance = resolveEntrance(attributes.entrance, metadata.attributes.entrance?.default);
    const hasCta = Boolean(ctaText || ctaLink?.url);
    const showHeading = Boolean(heading) || isSelected || !(body || hasCta);
    const part = partIndexes({ heading: showHeading, panel: true });

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Section', '__TEXT_DOMAIN__')} initialOpen={false}>
            <GroundSelect value={ground} onChange={(value) => setAttributes({ ground: value })} />
            <DividerControl value={sectionDivider} onChange={(value) => setAttributes({ sectionDivider: value })} />
          </PanelBody>

        </InspectorControls>

        <EntranceControl attributes={attributes} setAttributes={setAttributes} clientId={clientId} />

        <EditorSection slug="cta-split" ground={ground} sectionDivider={sectionDivider} entrance={entrance}>
          <div className="mx-auto flex max-w-[60.4375rem] flex-col gap-8 xl:flex-row xl:items-center xl:justify-between xl:gap-0">
            {showHeading && (
              <InlineHeading
                {...entrancePartProps(entrance, part.heading)}
                tier="statement"
                headingClass="heading-1"
                label={__('Heading', '__TEXT_DOMAIN__')}
                value={heading}
                placeholder={__('Write a heading', '__TEXT_DOMAIN__')}
                onChange={(value) => setAttributes({ heading: value })}
                className="xl:w-[45.2947%]"
              />
            )}

            <div {...entrancePartProps(entrance, part.panel)} className="flex flex-col items-start gap-8 xl:w-[48.0868%]">
              {(body || isSelected) && (
                <ParagraphsField
                  aria-label={__('Body', '__TEXT_DOMAIN__')}
                  value={body || ''}
                  onChange={(value) => setAttributes({ body: value })}
                  placeholder={__('Write the invitation copy', '__TEXT_DOMAIN__')}
                  className="text-small xl:text-body mt-0 p-1 text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                />
              )}

              <div className="flex w-full flex-col sm:w-auto">
                <CtaPreview
                  className="w-full sm:w-auto"
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
            </div>
          </div>
        </EditorSection>
      </>
    );
  },

  save: () => null,
});
