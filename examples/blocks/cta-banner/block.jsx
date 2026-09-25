import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useAttachmentUrls } from '../components/backend/useAttachmentUrls.js';
import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
import { ImagePositionControl, focalCss } from '../components/backend/ImagePositionControl.jsx';
import { ActionEditor } from '../components/backend/ActionEditor.jsx';
import { CtaPreview } from '../components/backend/CtaPreview.jsx';
import { EditorSection } from '../components/backend/EditorSection.jsx';
import { groundClass } from '../components/backend/ground.js';
import { GroundSelect } from '../components/backend/GroundSelect.jsx';
import { InlineField, InlineHeading } from '../components/backend/InlineField.jsx';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import { entrancePartProps, partIndexes, resolveEntrance } from '../components/backend/entranceCanvas.js';
import previewImage from './preview.svg';
import metadata from './block.json';

// Mirrors the wash in resources/views/blocks/cta-banner.blade.php: light copy
// gets a dark gradient, dark copy a light one, built from ground tokens
// (never an "earth" ramp value), each fading from transparent to the tone
// colour at the bottom edge of the lower half.
const WASH_GRADIENT = {
  light:
    'linear-gradient(to bottom, color-mix(in srgb, var(--color-ink) 0%, transparent) 0%, color-mix(in srgb, var(--color-ink) 60%, transparent) 100%)',
  dark: 'linear-gradient(to bottom, color-mix(in srgb, var(--color-surface) 0%, transparent) 0%, color-mix(in srgb, var(--color-surface) 85%, transparent) 100%)',
};

registerBlockType(metadata, {
  edit({ attributes, setAttributes, isSelected, clientId }) {
    const blockProps = useBlockProps();
    const {
      isPreview,
      heading,
      subtitle,
      ground,
      bgImageId,
      bgImageUrl,
      bgImagePosition,
      layout,
      textTone,
      scrim,
      ctaText,
      ctaLink,
      ctaIcon,
      ctaIconPosition,
    } = attributes;
    const attachmentUrls = useAttachmentUrls([Number(bgImageId) || 0]);

    if (isPreview) {
      return (
        <div {...blockProps}>
          <div style={{ width: '100%', aspectRatio: '900 / 242', borderRadius: '8px', overflow: 'hidden' }}>
            <img
              src={previewImage}
              alt={__('CTA Banner preview', '__TEXT_DOMAIN__')}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>
      );
    }

    const isPanel = layout === 'panel';
    const isLight = textTone === 'light';
    const heightClass = isPanel ? 'min-h-[22rem] lg:min-h-[30rem]' : 'min-h-[15rem]';
    const anchorClass = isPanel ? 'justify-end' : 'justify-center';
    const backgroundUrl = attachmentUrls[Number(bgImageId) || 0] || bgImageUrl;
    const hasBackground = Boolean(backgroundUrl);

    // The copy is light or dark by the saved tone, not by the ground, so each
    // field names its own color (CANVAS-12).
    const toneClass = isLight ? 'text-[color:var(--color-light)]' : 'text-[color:var(--color-ink)]';
    const flatFallback = hasBackground || groundClass(ground) ? '' : isLight ? 'bg-[color:var(--color-ink)]' : 'bg-[color:var(--color-surface)]';

    const entrance = resolveEntrance(attributes.entrance, metadata.attributes.entrance?.default);
    const hasCta = Boolean(ctaText || ctaLink?.url);
    const part = partIndexes({
      heading: Boolean(heading) || isSelected || !(subtitle || hasCta),
      subtitle: Boolean(subtitle) || isSelected,
      cta: hasCta || isSelected,
    });

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Background Media', '__TEXT_DOMAIN__')} initialOpen={false}>
            <AttachmentImageControl
              imageId={bgImageId}
              imageUrl={bgImageUrl}
              label={__('Background image (1920×1080)', '__TEXT_DOMAIN__')}
              height="140px"
              objectFit="cover"
              objectPosition={focalCss(bgImagePosition)}
              noStylesheet
              onSelect={(media) => setAttributes({ bgImageId: Number(media.id) || 0, bgImageUrl: '' })}
              onRemove={() => setAttributes({ bgImageId: 0, bgImageUrl: '' })}
            />
            <ImagePositionControl
              label={__('Focal point', '__TEXT_DOMAIN__')}
              value={bgImagePosition}
              onChange={(value) => setAttributes({ bgImagePosition: value })}
            />
          </PanelBody>

          <PanelBody title={__('Layout', '__TEXT_DOMAIN__')} initialOpen={false}>
            <SelectControl
              label={__('Height', '__TEXT_DOMAIN__')}
              value={layout}
              options={[
                { label: __('Band (copy centred)', '__TEXT_DOMAIN__'), value: 'band' },
                { label: __('Tall panel (copy at the bottom)', '__TEXT_DOMAIN__'), value: 'panel' },
              ]}
              onChange={(value) => setAttributes({ layout: value })}
            />
            <SelectControl
              label={__('Text tone', '__TEXT_DOMAIN__')}
              value={textTone}
              options={[
                { label: __('Dark, for a pale photo', '__TEXT_DOMAIN__'), value: 'dark' },
                { label: __('Light, for a dark photo', '__TEXT_DOMAIN__'), value: 'light' },
              ]}
              onChange={(value) => setAttributes({ textTone: value })}
            />
            <ToggleControl
              label={__('Lower-edge wash', '__TEXT_DOMAIN__')}
              checked={scrim}
              onChange={(value) => setAttributes({ scrim: value })}
              help={__('Darkens the lower edge under light text, lightens it under dark text.', '__TEXT_DOMAIN__')}
            />
          </PanelBody>

          <PanelBody title={__('Section', '__TEXT_DOMAIN__')} initialOpen={false}>
            <GroundSelect
              value={ground}
              onChange={(value) => setAttributes({ ground: value })}
              help={__('Shows when there is no photo.', '__TEXT_DOMAIN__')}
            />
          </PanelBody>

        </InspectorControls>

        <EntranceControl attributes={attributes} setAttributes={setAttributes} clientId={clientId} />

        <EditorSection
          slug="cta-banner"
          ground={hasBackground ? '' : ground}
          entrance={entrance}
          className={`${flatFallback} relative isolate flex flex-col ${heightClass} ${anchorClass}`}
        >
          {/* The photo is a passive preview; it is picked in the sidebar's Background Media panel. */}
          <div className="absolute inset-0 -z-10">
            {hasBackground && (
              <img
                src={backgroundUrl}
                alt=""
                className="block h-full w-full object-cover"
                style={{ objectPosition: focalCss(bgImagePosition) }}
              />
            )}
          </div>

          {scrim && (
            <div
              className="cta-banner__scrim pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2"
              style={{ backgroundImage: WASH_GRADIENT[isLight ? 'light' : 'dark'] }}
            />
          )}

          <div className={`mx-auto flex max-w-[57.5rem] flex-col items-center gap-8 text-center ${toneClass}`}>
            {part.heading !== null && (
              <InlineHeading
                {...entrancePartProps(entrance, part.heading)}
                tier="section"
                headingClass="heading-2"
                label={__('Heading', '__TEXT_DOMAIN__')}
                value={heading}
                placeholder={__('Write a heading', '__TEXT_DOMAIN__')}
                onDark={isLight}
                onChange={(value) => setAttributes({ heading: value })}
                className="text-center"
              />
            )}

            {part.subtitle !== null && (
              <div {...entrancePartProps(entrance, part.subtitle)} className="flex w-full justify-center">
                <InlineField
                  label={__('Subtitle', '__TEXT_DOMAIN__')}
                  value={subtitle}
                  placeholder={__('Add a line under the heading', '__TEXT_DOMAIN__')}
                  onDark={isLight}
                  onChange={(value) => setAttributes({ subtitle: value })}
                  className="text-lead max-w-[55.75rem] text-center"
                />
              </div>
            )}

            <div {...entrancePartProps(entrance, part.cta)} className="flex w-full flex-col items-center">
              <CtaPreview
                className="w-full sm:w-auto"
                text={ctaText}
                link={ctaLink}
                icon={ctaIcon}
                iconPosition={ctaIconPosition}
                ground={ground}
                tone={textTone}
                isSelected={isSelected}
              />
              {/* Content is edited on the canvas, never in the sidebar. */}
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
