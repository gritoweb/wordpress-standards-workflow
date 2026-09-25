import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { ActionEditor, stackedStyles } from '../components/backend/ActionEditor.jsx';
import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
import { DividerControl } from '../components/backend/DividerControl.jsx';
import { EditorSection } from '../components/backend/EditorSection.jsx';
import { clamp, emptyLink, fieldLabel } from '../components/backend/editorCanvas.js';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import { entrancePartProps, partIndexes, resolveEntrance } from '../components/backend/entranceCanvas.js';
import { isLightGround } from '../components/backend/ground.js';
import { GroundSelect } from '../components/backend/GroundSelect.jsx';
import { InlineField, InlineHeading } from '../components/backend/InlineField.jsx';
import { ItemList } from '../components/backend/ItemList.jsx';
import { LinkPicker } from '../components/backend/LinkPicker.jsx';
import { logoTintClass } from '../components/backend/logoTint.js';
import { itemKey, useRepeater } from '../components/backend/useRepeater.js';
import { useAttachmentUrls } from '../components/backend/useAttachmentUrls.js';
import previewImage from './preview.svg';
import metadata from './block.json';

// block.php's own numbers: six logos per default row, and the drawn size it
// falls back to when an attachment records no dimensions. The editor never
// has those dimensions, so it always takes the fallback.
const PER_ROW = 6;
const FALLBACK_WIDTH = 120;
const MAX_HEIGHT = 70;

/**
 * Groups logos into the rows block.php builds: one brand per attachment,
 * ordered inside its row, each row's gap taken from its first logo.
 */
function buildBrandRows(logos) {
  const seen = new Set();
  const rows = new Map();

  logos.forEach((logo, index) => {
    const imageId = Number(logo.imageId) || 0;
    if (imageId && seen.has(imageId)) return;
    if (imageId) seen.add(imageId);

    const desktop = logo.desktop || {};
    const row = clamp(desktop.row, 1, 100, Math.floor(index / PER_ROW) + 1);
    const width = clamp(desktop.width, 1, 600, FALLBACK_WIDTH);
    const height = clamp(desktop.height, 1, 100, MAX_HEIGHT);

    if (!rows.has(row)) {
      rows.set(row, { gap: Math.min(96, clamp(desktop.gap, 0, 96, 48)), logos: [] });
    }

    rows.get(row).logos.push({
      index,
      logo,
      width,
      height,
      cellWidth: clamp(desktop.cellWidth, 1, 640, width),
      cellHeight: Math.max(height, clamp(desktop.cellHeight, 1, 100, 70)),
      order: clamp(desktop.order, 0, Number.MAX_SAFE_INTEGER, index),
    });
  });

  return [...rows.entries()]
    .sort(([a], [b]) => a - b)
    .map(([row, value]) => ({
      row,
      gap: value.gap,
      logos: [...value.logos].sort((a, b) => a.order - b.order),
    }));
}


registerBlockType(metadata, {
  edit({ attributes, setAttributes, isSelected, clientId }) {
    const blockProps = useBlockProps();
    const { isPreview, heading, logos, ctaText, ctaLink, ground, sectionDivider } = attributes;
    const resolvedDivider = sectionDivider || 'none';
    const lightGround = isLightGround(ground);
    const entrance = resolveEntrance(attributes.entrance, metadata.attributes.entrance?.default);

    const rows = useRepeater({
      items: logos,
      setItems: (next) => setAttributes({ logos: next }),
      blank: () => ({ imageId: 0, name: '', singleColor: false, link: emptyLink() }),
    });
    const attachmentUrls = useAttachmentUrls(rows.items.map((entry) => entry.imageId));

    if (isPreview) {
      return (
        <div {...blockProps}>
          <div style={{ width: '100%', aspectRatio: '1000 / 187', borderRadius: '8px', overflow: 'hidden' }}>
            <img
              src={previewImage}
              alt={__('Logo wall preview', '__TEXT_DOMAIN__')}
              width={1000}
              height={187}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>
      );
    }

    const active = rows.activeItem;
    const hasCtaValue = Boolean(ctaText || ctaLink?.url);
    const ctaIsComplete = Boolean(ctaText && ctaLink?.url);
    const previewCtaLabel = ctaIsComplete
      ? ctaText
      : hasCtaValue
        ? __('Complete read more link', '__TEXT_DOMAIN__')
        : __('Add read more link', '__TEXT_DOMAIN__');
    const showHeading = Boolean(heading) || isSelected;
    const showCta = hasCtaValue || isSelected;
    const brandRows = buildBrandRows(rows.items);
    const part = partIndexes({ heading: showHeading });
    const firstLogoPart = showHeading ? 1 : 0;
    const brandPartIndex = new Map(
      brandRows
        .flatMap((row) => row.logos)
        .map((cell, position) => [cell.index, position + firstLogoPart]),
    );

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Logos', '__TEXT_DOMAIN__')} initialOpen={false}>
            <ItemList
              items={rows.items}
              activeItem={rows.active}
              setActiveItem={rows.setActive}
              onAdd={rows.add}
              onRemove={rows.remove}
              onMove={rows.move}
              getLabel={(entry) => entry.name}
              getThumb={(entry) => attachmentUrls[entry.imageId]}
              addButtonLabel={__('Add logo', '__TEXT_DOMAIN__')}
              itemLabelPrefix={__('Logo', '__TEXT_DOMAIN__')}
              removeConfirm={__('Remove this logo?', '__TEXT_DOMAIN__')}
              minItems={0}
            />

            {active && (
              <div style={stackedStyles.group}>
                <ToggleControl
                  label={__('Single-color mark', '__TEXT_DOMAIN__')}
                  help={__('Redraws the mark dark on a light ground and light on a dark one.', '__TEXT_DOMAIN__')}
                  checked={Boolean(active.singleColor)}
                  onChange={(value) => rows.update(rows.active, { singleColor: Boolean(value) })}
                />
                <details>
                  <summary>{__('Arrangement', '__TEXT_DOMAIN__')}</summary>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', paddingTop: '12px' }}>
                    {[
                      ['row', __('Row', '__TEXT_DOMAIN__')],
                      ['order', __('Position in row', '__TEXT_DOMAIN__')],
                      ['width', __('Logo width (px)', '__TEXT_DOMAIN__')],
                      ['height', __('Logo height (px)', '__TEXT_DOMAIN__')],
                      ['cellWidth', __('Space width (px)', '__TEXT_DOMAIN__')],
                      ['cellHeight', __('Space height (px)', '__TEXT_DOMAIN__')],
                      ['gap', __('Row spacing (px)', '__TEXT_DOMAIN__')],
                    ].map(([key, label]) => (
                      <TextControl
                        key={key}
                        label={label}
                        type="number"
                        min={0}
                        step="any"
                        value={active.desktop?.[key] ?? ''}
                        onChange={(value) => {
                          const settings = { ...active.desktop };
                          if (value === '') delete settings[key];
                          else settings[key] = Number(value);
                          rows.update(rows.active, { desktop: settings });
                        }}
                      />
                    ))}
                  </div>
                </details>
              </div>
            )}
          </PanelBody>

          <PanelBody title={__('Section', '__TEXT_DOMAIN__')} initialOpen={false}>
            <GroundSelect value={ground} onChange={(value) => setAttributes({ ground: value })} />
            <DividerControl value={resolvedDivider} onChange={(value) => setAttributes({ sectionDivider: value })} />
          </PanelBody>

        </InspectorControls>

        <EntranceControl attributes={attributes} setAttributes={setAttributes} clientId={clientId} />

        <EditorSection slug="logo-wall" ground={ground} sectionDivider={resolvedDivider} entrance={entrance}>
          <div className="flex flex-col items-center gap-16 text-center">
            {showHeading && (
              <InlineHeading
                {...entrancePartProps(entrance, part.heading)}
                tier="section"
                headingClass="logo-wall__heading heading-2"
                label={__('Heading', '__TEXT_DOMAIN__')}
                value={heading}
                placeholder={__('Add a heading', '__TEXT_DOMAIN__')}
                onDark={!lightGround}
                onChange={(value) => setAttributes({ heading: value })}
                className="max-w-[55.75rem] text-center"
              />
            )}

            {rows.items.length === 0 ? (
              <p className={`m-0 text-small ${lightGround ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-surface)]'}`}>
                {__('Add logos in the Logos panel.', '__TEXT_DOMAIN__')}
              </p>
            ) : (
              <div className="logo-wall__brand-rows grid w-full grid-cols-1 gap-x-4 gap-y-6 min-[24rem]:grid-cols-2 xl:flex xl:flex-col xl:gap-0">
                {brandRows.map((row) => (
                  <ul
                    key={row.row}
                    className="logo-wall__brand-row m-0 contents list-none p-0 xl:flex xl:flex-wrap xl:items-center xl:justify-center"
                    style={{ '--brand-gap': `${row.gap}px`, gap: '0.75rem var(--brand-gap)' }}
                  >
                    {row.logos.map((cell) => (
                      <li
                        key={itemKey(cell.logo, cell.index)}
                        className="logo-wall__brand-logo relative flex h-14 min-w-0 items-center justify-center xl:h-[var(--brand-height)] xl:overflow-hidden"
                        data-logo-index={cell.index}
                        {...entrancePartProps(entrance, brandPartIndex.get(cell.index))}
                        style={{
                          '--brand-cell': `${cell.cellWidth}px`,
                          '--brand-height': `${cell.cellHeight}px`,
                          '--brand-width': `${cell.width}px`,
                          flex: '0 1 var(--brand-cell)',
                        }}
                      >
                        <div className="h-14 w-[var(--brand-width)] xl:h-[var(--brand-height)]">
                          <AttachmentImageControl
                            imageId={cell.logo.imageId}
                            label={`${__('Logo image (300×150) for', '__TEXT_DOMAIN__')} ${cell.logo.name || cell.index + 1}`}
                            emptyLabel={`${__('Add image for', '__TEXT_DOMAIN__')} ${cell.logo.name || cell.index + 1}`}
                            replaceLabel={`${__('Replace image for', '__TEXT_DOMAIN__')} ${cell.logo.name || cell.index + 1}`}
                            height="100%"
                            objectFit="contain"
                            background="transparent"
                            imageClassName={logoTintClass(Boolean(cell.logo.singleColor), lightGround)}
                            onSelect={(media) => rows.update(cell.index, { imageId: Number(media.id) || 0 })}
                          />
                        </div>
                        {/* Name (the alt text) and link are edited on the canvas, under the logo. */}
                        {isSelected && (
                          <div className="absolute inset-x-0 top-full z-10 flex flex-col gap-1 pt-1">
                            <InlineField
                              label={__('Client name', '__TEXT_DOMAIN__')}
                              position={cell.index}
                              value={cell.logo.name}
                              placeholder={__('Add the client name', '__TEXT_DOMAIN__')}
                              onDark={!lightGround}
                              onChange={(value) => rows.update(cell.index, { name: value })}
                              className="text-small text-center"
                            />
                            <LinkPicker
                              label={fieldLabel(__('Client link', '__TEXT_DOMAIN__'), cell.index)}
                              value={cell.logo.link || emptyLink()}
                              onChange={(value) => rows.update(cell.index, { link: value })}
                            />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            )}

            {showCta && (
              <div className="flex flex-col items-center">
                <span
                  role="group"
                  aria-label={__('Read more link preview', '__TEXT_DOMAIN__')}
                  className="logo-wall__cta btn btn-link"
                  style={{ pointerEvents: 'none' }}
                >
                  {previewCtaLabel}
                </span>
                {isSelected && (
                  <ActionEditor
                    groupLabel={__('Read more link editing', '__TEXT_DOMAIN__')}
                    label={__('Read more link text', '__TEXT_DOMAIN__')}
                    linkLabel={__('Read more link destination', '__TEXT_DOMAIN__')}
                    text={ctaText}
                    link={ctaLink}
                    onTextChange={(value) => setAttributes({ ctaText: value })}
                    onLinkChange={(value) => setAttributes({ ctaLink: value })}
                  />
                )}
              </div>
            )}
          </div>
        </EditorSection>
      </>
    );
  },

  save: () => null,
});
