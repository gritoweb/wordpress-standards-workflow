import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { ActionEditor } from '../components/backend/ActionEditor.jsx';
import { CtaPreview } from '../components/backend/CtaPreview.jsx';
import { DividerControl } from '../components/backend/DividerControl.jsx';
import { EditorSection } from '../components/backend/EditorSection.jsx';
import { EDITOR_TYPE } from '../components/backend/editorCanvas.js';
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
    const {
      isPreview,
      heading,
      body,
      align,
      measure,
      bodyScale,
      ground,
      sectionDivider,
      ctaText,
      ctaLink,
      ctaIcon,
      ctaIconPosition,
    } = attributes;

    if (isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Section Intro preview', '__TEXT_DOMAIN__')}
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
          />
        </div>
      );
    }

    const isCentered = align === 'center';
    const isStatement = bodyScale === 'statement';
    const stackAlignClass = isCentered ? 'items-center text-center' : 'items-start text-left';
    const controlAlignClass = isCentered ? 'text-center' : 'text-left';

    const headingMeasure = isStatement ? 'max-w-full' : measure === 'wide' ? 'max-w-full' : 'max-w-[min(57.5rem,100%)]';
    const bodyMeasure = isStatement
      ? 'max-w-[65.25rem]'
      : measure === 'wide'
        ? 'max-w-[min(68.625rem,100%)]'
        : 'max-w-[min(55.75rem,100%)]';
    const bodyTypeClass = isStatement ? `heading-4 heading-regular ${EDITOR_TYPE.section}` : 'text-lead';

    // A block that keeps the global entrance default (see BlockManager)
    // declares no `entrance` key in its own block.json, so the preset here
    // is undefined; resolveEntrance()'s own fallbacks then match the global
    // default exactly, the same way BlockEntrance::sanitize() does server-side.
    const entrance = resolveEntrance(attributes.entrance, metadata.attributes.entrance?.default);
    const hasCta = Boolean(ctaText || ctaLink?.url);
    const showHeading = Boolean(heading) || isSelected || !(body || hasCta);
    const part = partIndexes({ heading: showHeading, body: Boolean(body) || isSelected, cta: hasCta || isSelected });

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Layout', '__TEXT_DOMAIN__')} initialOpen={false}>
            <SelectControl
              label={__('Alignment', '__TEXT_DOMAIN__')}
              value={align}
              options={[
                { label: __('Center', '__TEXT_DOMAIN__'), value: 'center' },
                { label: __('Left', '__TEXT_DOMAIN__'), value: 'left' },
              ]}
              onChange={(value) => setAttributes({ align: value })}
            />
            <SelectControl
              label={__('Text width', '__TEXT_DOMAIN__')}
              value={measure}
              options={[
                { label: __('Standard', '__TEXT_DOMAIN__'), value: 'default' },
                { label: __('Wide', '__TEXT_DOMAIN__'), value: 'wide' },
              ]}
              onChange={(value) => setAttributes({ measure: value })}
            />
            <SelectControl
              label={__('Body scale', '__TEXT_DOMAIN__')}
              value={bodyScale}
              options={[
                { label: __('Standard', '__TEXT_DOMAIN__'), value: 'standard' },
                { label: __('Statement', '__TEXT_DOMAIN__'), value: 'statement' },
              ]}
              onChange={(value) => setAttributes({ bodyScale: value })}
            />
          </PanelBody>

          <PanelBody title={__('Section', '__TEXT_DOMAIN__')} initialOpen={false}>
            <GroundSelect value={ground} onChange={(value) => setAttributes({ ground: value })} />
            <DividerControl value={sectionDivider} onChange={(value) => setAttributes({ sectionDivider: value })} />
          </PanelBody>

        </InspectorControls>

        <EntranceControl attributes={attributes} setAttributes={setAttributes} clientId={clientId} />

        <EditorSection slug="section-intro" ground={ground} sectionDivider={sectionDivider} entrance={entrance}>
          <div className={`flex flex-col gap-8 ${stackAlignClass}`}>
            {showHeading && (
              <InlineHeading
                {...entrancePartProps(entrance, part.heading)}
                tier="section"
                headingClass="heading-2"
                label={__('Heading', '__TEXT_DOMAIN__')}
                value={heading}
                placeholder={__('Write a heading', '__TEXT_DOMAIN__')}
                onChange={(value) => setAttributes({ heading: value })}
                className={`${controlAlignClass} ${headingMeasure}`}
              />
            )}

            {(body || isSelected) && (
              <div {...entrancePartProps(entrance, part.body)} className="flex w-full flex-col">
                <ParagraphsField
                  aria-label={__('Body', '__TEXT_DOMAIN__')}
                  value={body || ''}
                  onChange={(value) => setAttributes({ body: value })}
                  placeholder={__('Write the introduction', '__TEXT_DOMAIN__')}
                  className={`${bodyTypeClass} ${bodyMeasure} mt-0 p-1 text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]`}
                />
              </div>
            )}

            <div {...entrancePartProps(entrance, part.cta)}>
              <CtaPreview
                className="section-intro__cta w-full sm:w-auto"
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
        </EditorSection>
      </>
    );
  },

  save: () => null,
});
