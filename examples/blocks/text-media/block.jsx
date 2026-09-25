import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { ActionEditor, stackedStyles } from '../components/backend/ActionEditor.jsx';
import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
import { CtaPreview } from '../components/backend/CtaPreview.jsx';
import { DividerControl } from '../components/backend/DividerControl.jsx';
import { EditorSection } from '../components/backend/EditorSection.jsx';
import { EDITOR_TYPE, emptyLink, fieldLabel } from '../components/backend/editorCanvas.js';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import { entrancePartProps, partIndexes, resolveEntrance } from '../components/backend/entranceCanvas.js';
import { GROUNDS, isLightGround } from '../components/backend/ground.js';
import { GroundSelect } from '../components/backend/GroundSelect.jsx';
import { focalCss, ImagePositionControl } from '../components/backend/ImagePositionControl.jsx';
import { InlineField, InlineHeading } from '../components/backend/InlineField.jsx';
import { ItemList } from '../components/backend/ItemList.jsx';
import { logoTintClass } from '../components/backend/logoTint.js';
import { ParagraphsField } from '../components/backend/ParagraphsField.jsx';
import { itemKey, useRepeater } from '../components/backend/useRepeater.js';
import { useAttachmentUrls } from '../components/backend/useAttachmentUrls.js';
import previewImage from './preview.svg';
import metadata from './block.json';

registerBlockType(metadata, {
  edit({ attributes, setAttributes, isSelected, clientId }) {
    const blockProps = useBlockProps();
    const {
      isPreview,
      eyebrow,
      heading,
      body,
      scale,
      sectionDivider,
      mediaPosition,
      mediaType,
      mediaBleed,
      mediaRatio,
      imageId,
      imageUrl,
      imagePosition,
      ground,
      logos,
      ctaText,
      ctaLink,
      ctaIcon,
      ctaIconPosition,
      items,
    } = attributes;
    const logoRows = useRepeater({
      items: logos,
      setItems: (next) => setAttributes({ logos: next }),
      blank: () => ({ imageId: 0, name: '', singleColor: false, link: emptyLink() }),
    });
    const itemRows = useRepeater({ items, setItems: (next) => setAttributes({ items: next }) });
    const attachmentUrls = useAttachmentUrls(logoRows.items.map((entry) => entry.imageId));

    if (isPreview) {
      return (
        <div {...blockProps}>
          <div style={{ width: '100%', aspectRatio: '792 / 412', borderRadius: '8px', overflow: 'hidden' }}>
            <img
              src={previewImage}
              alt={__('Text and media split preview', '__TEXT_DOMAIN__')}
              width={792}
              height={412}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>
      );
    }

    const currentGround = GROUNDS.find((entry) => entry.value === ground) ?? { background: 'var(--color-surface)' };
    const lightGround = isLightGround(ground);
    const activeLogo = logoRows.activeItem;
    const populatedLogos = logoRows.items.filter((entry) => Number(entry.imageId) > 0);
    const isSingleLogoColumn = populatedLogos.length > 0 && populatedLogos.length <= 2;
    const hasCta = Boolean(ctaText || ctaLink?.url);
    const hasIntroduction = Boolean(heading || eyebrow || body);
    const showIntroduction = hasIntroduction || itemRows.items.length === 0;
    const isFeature = scale === 'feature';
    const imageAspect = {
      portrait: '529 / 807',
      landscape: '16 / 9',
      square: '1 / 1',
      auto: mediaBleed ? '706 / 680' : isFeature ? '530 / 561' : '581 / 606',
    }[mediaRatio || 'auto'];
    const contentWidthClass = mediaBleed
      ? isFeature
        ? 'lg:w-[46.635%]'
        : 'lg:w-[49.199%]'
      : isFeature
        ? 'lg:w-[50.9%]'
        : 'lg:w-[48.65%]';

    const entrance = resolveEntrance(attributes.entrance, metadata.attributes.entrance?.default);
    // One running index across the parts the canvas draws, in reading order.
    const drawn = {
      heading: showIntroduction && Boolean(heading || isSelected || !(eyebrow || body)),
      eyebrow: showIntroduction && Boolean(eyebrow || isSelected),
      body: showIntroduction && Boolean(body || isSelected),
    };
    itemRows.items.forEach((_entry, index) => {
      drawn[`item${index}`] = true;
    });
    drawn.cta = hasCta || isSelected;
    drawn.media = true;
    const part = partIndexes(drawn);

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Items', '__TEXT_DOMAIN__')} initialOpen={false}>
            <ItemList
              items={itemRows.items}
              activeItem={itemRows.active}
              setActiveItem={itemRows.setActive}
              onAdd={itemRows.add}
              onRemove={itemRows.remove}
              onMove={itemRows.move}
              getLabel={(entry) => entry.heading}
              addButtonLabel={__('Add item', '__TEXT_DOMAIN__')}
              itemLabelPrefix={__('Item', '__TEXT_DOMAIN__')}
              removeConfirm={__('Remove this item?', '__TEXT_DOMAIN__')}
              minItems={0}
              selectable={false}
            />
          </PanelBody>

          {mediaType === 'logos' && (
            <PanelBody title={__('Logos', '__TEXT_DOMAIN__')} initialOpen={false}>
              <ItemList
                items={logoRows.items}
                activeItem={logoRows.active}
                setActiveItem={logoRows.setActive}
                onAdd={logoRows.add}
                onRemove={logoRows.remove}
                onMove={logoRows.move}
                getLabel={(entry) => entry.name}
                getThumb={(entry) => attachmentUrls[entry.imageId]}
                addButtonLabel={__('Add logo', '__TEXT_DOMAIN__')}
                itemLabelPrefix={__('Logo', '__TEXT_DOMAIN__')}
                removeConfirm={__('Remove this logo?', '__TEXT_DOMAIN__')}
                minItems={0}
              />

              {activeLogo && (
                <div style={stackedStyles.group}>
                  <ToggleControl
                    label={__('Single-color mark', '__TEXT_DOMAIN__')}
                    help={__('Redraws the mark dark on a light ground and light on a dark one.', '__TEXT_DOMAIN__')}
                    checked={Boolean(activeLogo.singleColor)}
                    onChange={(value) => logoRows.update(logoRows.active, { singleColor: Boolean(value) })}
                  />
                </div>
              )}
            </PanelBody>
          )}

          <PanelBody title={__('Media', '__TEXT_DOMAIN__')} initialOpen={false}>
            <SelectControl
              label={__('Media side', '__TEXT_DOMAIN__')}
              value={mediaPosition}
              options={[
                { label: __('Right', '__TEXT_DOMAIN__'), value: 'right' },
                { label: __('Left', '__TEXT_DOMAIN__'), value: 'left' },
              ]}
              onChange={(value) => setAttributes({ mediaPosition: value })}
            />
            <SelectControl
              label={__('Media type', '__TEXT_DOMAIN__')}
              value={mediaType}
              options={[
                { label: __('Image', '__TEXT_DOMAIN__'), value: 'image' },
                { label: __('Logo panel', '__TEXT_DOMAIN__'), value: 'logos' },
              ]}
              onChange={(value) => setAttributes({ mediaType: value })}
            />
            {mediaType === 'logos' && <GroundSelect value={ground} onChange={(value) => setAttributes({ ground: value })} />}
            {mediaType === 'image' && (
              <SelectControl
                label={__('Media shape', '__TEXT_DOMAIN__')}
                value={mediaRatio}
                options={[
                  { label: __('Automatic', '__TEXT_DOMAIN__'), value: 'auto' },
                  { label: __('Portrait', '__TEXT_DOMAIN__'), value: 'portrait' },
                  { label: __('Landscape', '__TEXT_DOMAIN__'), value: 'landscape' },
                  { label: __('Square', '__TEXT_DOMAIN__'), value: 'square' },
                ]}
                onChange={(value) => setAttributes({ mediaRatio: value })}
                help={__('The photo crops to fill this shape.', '__TEXT_DOMAIN__')}
              />
            )}
            {mediaType === 'image' && (
              <ImagePositionControl
                label={__('Focal point', '__TEXT_DOMAIN__')}
                value={imagePosition}
                onChange={(value) => setAttributes({ imagePosition: value })}
              />
            )}
            <SelectControl
              label={__('Media width', '__TEXT_DOMAIN__')}
              value={mediaBleed ? 'full-bleed' : 'contained'}
              options={[
                { label: __('Contained', '__TEXT_DOMAIN__'), value: 'contained' },
                { label: __('Full bleed', '__TEXT_DOMAIN__'), value: 'full-bleed' },
              ]}
              onChange={(value) => setAttributes({ mediaBleed: value === 'full-bleed' })}
            />
          </PanelBody>

          <PanelBody title={__('Section', '__TEXT_DOMAIN__')} initialOpen={false}>
            <SelectControl
              label={__('Scale', '__TEXT_DOMAIN__')}
              value={scale}
              options={[
                { label: __('Feature', '__TEXT_DOMAIN__'), value: 'feature' },
                { label: __('Compact', '__TEXT_DOMAIN__'), value: 'compact' },
              ]}
              onChange={(value) => setAttributes({ scale: value })}
            />
            <DividerControl value={sectionDivider || 'none'} onChange={(value) => setAttributes({ sectionDivider: value })} />
          </PanelBody>

        </InspectorControls>

        <EntranceControl attributes={attributes} setAttributes={setAttributes} clientId={clientId} />

        <EditorSection
          slug="text-media"
          sectionDivider={sectionDivider || 'none'}
          entrance={entrance}
          data-media-position={mediaPosition}
          data-media-type={mediaType}
          data-media-bleed={String(Boolean(mediaBleed))}
        >
          <div
            className={`flex flex-col gap-8 lg:items-center lg:gap-16 ${mediaPosition === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}
          >
            <div className={`min-w-0 lg:shrink-0 ${contentWidthClass}`}>
              {showIntroduction && (
                <div className="text-media-editor__introduction">
                  {part.heading !== null && (
                    <div {...entrancePartProps(entrance, part.heading)}>
                      <InlineHeading
                        tier="section"
                        headingClass={isFeature ? 'heading-2' : 'heading-4'}
                        label={__('Main heading', '__TEXT_DOMAIN__')}
                        value={heading}
                        placeholder={__('Write a heading', '__TEXT_DOMAIN__')}
                        onChange={(value) => setAttributes({ heading: value })}
                      />
                    </div>
                  )}
                  {part.eyebrow !== null && (
                    <div {...entrancePartProps(entrance, part.eyebrow)}>
                      <InlineField
                        label={__('Supporting line', '__TEXT_DOMAIN__')}
                        value={eyebrow}
                        placeholder={__('Add a supporting line', '__TEXT_DOMAIN__')}
                        onChange={(value) => setAttributes({ eyebrow: value })}
                        className="text-lead mt-4"
                      />
                    </div>
                  )}
                  {part.body !== null && (
                    <div {...entrancePartProps(entrance, part.body)}>
                      <ParagraphsField
                        aria-label={__('Introduction body', '__TEXT_DOMAIN__')}
                        value={body || ''}
                        onChange={(value) => setAttributes({ body: value })}
                        placeholder={__('Write the introduction', '__TEXT_DOMAIN__')}
                        className={`mt-5 p-1 text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] ${isFeature ? 'text-lead' : ''}`}
                      />
                    </div>
                  )}
                </div>
              )}

              {itemRows.items.length > 0 && (
                <div className={hasIntroduction ? 'mt-8' : ''}>
                  {itemRows.items.map((entry, index) => {
                    const entryName = entry.heading || `${__('Entry', '__TEXT_DOMAIN__')} ${index + 1}`;

                    return (
                      <div
                        key={itemKey(entry, index)}
                        data-entry-index={index}
                        {...entrancePartProps(entrance, part[`item${index}`])}
                        className="text-media-editor__entry border-t border-[color:var(--color-ink)] py-7 first:border-t-0 first:pt-0"
                      >
                        {(entry.heading || isSelected) && (
                          <InlineHeading
                            tier="entry"
                            headingClass="heading-4"
                            label={__('Entry heading', '__TEXT_DOMAIN__')}
                            position={index}
                            value={entry.heading}
                            placeholder={__('Write an entry heading', '__TEXT_DOMAIN__')}
                            onChange={(value) => itemRows.update(index, { heading: value })}
                          />
                        )}
                        {(entry.body || isSelected) && (
                          <ParagraphsField
                            aria-label={`${__('Entry body', '__TEXT_DOMAIN__')} ${index + 1}`}
                            value={entry.body || ''}
                            onChange={(value) => itemRows.update(index, { body: value })}
                            placeholder={__('Write the entry copy', '__TEXT_DOMAIN__')}
                            className="mt-5 p-1 text-[color:var(--color-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
                          />
                        )}
                        {entry.linkText && !isSelected && <span className="btn btn-link mt-8">{entry.linkText}</span>}
                        {/* The link is edited on the canvas, under its item (create-block: CTA inside a repeater item). */}
                        {isSelected && (
                          <ActionEditor
                            stacked
                            groupLabel={`${entryName}: ${__('link', '__TEXT_DOMAIN__')}`}
                            label={__('Link label', '__TEXT_DOMAIN__')}
                            linkLabel={__('Link destination', '__TEXT_DOMAIN__')}
                            text={entry.linkText}
                            link={entry.link}
                            onTextChange={(value) => itemRows.update(index, { linkText: value })}
                            onLinkChange={(value) => itemRows.update(index, { link: value })}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div {...entrancePartProps(entrance, part.cta)} className="mt-6">
                <CtaPreview
                  className="text-media__cta w-full sm:w-auto"
                  text={ctaText}
                  link={ctaLink}
                  icon={ctaIcon}
                  iconPosition={ctaIconPosition}
                  ground=""
                  isSelected={isSelected}
                />
                {isSelected && (
                  <ActionEditor
                    groupLabel={__('Section CTA editing', '__TEXT_DOMAIN__')}
                    label={__('Section CTA label', '__TEXT_DOMAIN__')}
                    linkLabel={__('Section CTA destination', '__TEXT_DOMAIN__')}
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

            <div
              className={`min-w-0 flex-1 ${mediaType === 'logos' ? '' : 'overflow-hidden'} ${mediaBleed ? 'mx-[-1.5rem] lg:mx-0' : ''}`}
              data-media-framing={mediaBleed ? 'bleed' : 'contained'}
              {...entrancePartProps(entrance, part.media)}
              style={{
                ...(mediaType === 'logos' ? { aspectRatio: '723 / 692' } : { aspectRatio: imageAspect, maxHeight: '28rem' }),
                ...entrancePartProps(entrance, part.media).style,
              }}
            >
              {mediaType === 'image' ? (
                <AttachmentImageControl
                  imageId={imageId}
                  imageUrl={imageUrl}
                  label={__('Section image (1200×800)', '__TEXT_DOMAIN__')}
                  height="100%"
                  objectFit="cover"
                  objectPosition={focalCss(imagePosition)}
                  onSelect={(media) => setAttributes({ imageId: Number(media.id) || 0, imageUrl: '' })}
                  onRemove={() => setAttributes({ imageId: 0, imageUrl: '' })}
                />
              ) : (
                <div
                  className={`grid min-h-64 items-center justify-items-center gap-x-6 gap-y-4 rounded-[var(--radius-card)] p-6 ${isSingleLogoColumn ? 'grid-cols-1' : 'grid-cols-2'}`}
                  style={{ background: currentGround.background }}
                >
                  {isSelected ? (
                    logoRows.items.map((entry, index) => (
                      <div key={itemKey(entry, index)} data-logo-index={index} className="flex w-full flex-col items-center gap-2">
                        <AttachmentImageControl
                          imageId={entry.imageId}
                          label={fieldLabel(__('Logo image (300×150)', '__TEXT_DOMAIN__'), index)}
                          emptyLabel={__('Add logo image', '__TEXT_DOMAIN__')}
                          replaceLabel={__('Replace logo image', '__TEXT_DOMAIN__')}
                          height="80px"
                          objectFit="contain"
                          background="transparent"
                          imageClassName={logoTintClass(Boolean(entry.singleColor), lightGround)}
                          onSelect={(media) => logoRows.update(index, { imageId: Number(media.id) || 0 })}
                        />
                        {/* The name is the logo's alt text, so it's edited here, never in the sidebar. */}
                        <InlineField
                          label={__('Client name', '__TEXT_DOMAIN__')}
                          position={index}
                          value={entry.name}
                          placeholder={__('Add the client name', '__TEXT_DOMAIN__')}
                          onDark={!lightGround}
                          onChange={(value) => logoRows.update(index, { name: value })}
                          className="text-small text-center"
                        />
                      </div>
                    ))
                  ) : populatedLogos.length ? (
                    populatedLogos.map((entry, index) => {
                      const logoUrl = attachmentUrls[entry.imageId];
                      const isLonelyLastRow =
                        !isSingleLogoColumn && populatedLogos.length % 2 === 1 && index === populatedLogos.length - 1;

                      return logoUrl ? (
                        <img
                          key={itemKey(entry, index)}
                          src={logoUrl}
                          alt={entry.name || ''}
                          data-logo-index={index}
                          className={logoTintClass(Boolean(entry.singleColor), lightGround)}
                          style={{
                            display: 'block',
                            maxWidth: isLonelyLastRow ? 'calc((100% - 1.5rem) / 2)' : '100%',
                            maxHeight: '3.75rem',
                            minWidth: 0,
                            objectFit: 'contain',
                            ...(isLonelyLastRow ? { gridColumn: '1 / -1' } : {}),
                          }}
                        />
                      ) : (
                        <span key={itemKey(entry, index)} className="text-small text-[color:var(--color-surface)]">
                          {entry.name || __('Logo preview unavailable', '__TEXT_DOMAIN__')}
                        </span>
                      );
                    })
                  ) : (
                    <p className="m-0 text-small text-[color:var(--color-surface)]">
                      {__('Add logos in the Logos panel, then select the block to pick each image.', '__TEXT_DOMAIN__')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </EditorSection>
      </>
    );
  },

  save: () => null,
});
