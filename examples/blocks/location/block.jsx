import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { Button, PanelBody, RangeControl, SelectControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ActionEditor, stackedStyles } from '../components/backend/ActionEditor.jsx';
import { AddPrompt } from '../components/backend/AddPrompt.jsx';
import { CtaPreview } from '../components/backend/CtaPreview.jsx';
import { DividerControl } from '../components/backend/DividerControl.jsx';
import { EditorSection } from '../components/backend/EditorSection.jsx';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import { entrancePartProps, partIndexes, resolveEntrance } from '../components/backend/entranceCanvas.js';
import { GroundSelect } from '../components/backend/GroundSelect.jsx';
import { InfoPanel, INFO_PANEL_TEXT_STYLE } from '../components/backend/InfoPanel.jsx';
import { InlineField, InlineHeading } from '../components/backend/InlineField.jsx';
import locationMarkerIcon from '../../images/icons/location-marker.svg';
import phoneIcon from '../../images/icons/phone.svg';
import newspaperIcon from '../../images/icons/newspaper.svg';
import userCircleIcon from '../../images/icons/user-circle.svg';
import mailIcon from '../../images/icons/mail.svg';
import { useLocator } from './useLocator.js';
import previewImage from './preview.svg';
import metadata from './block.json';

const MEDIA_POSITIONS = [
  { label: __('Right', '__TEXT_DOMAIN__'), value: 'right' },
  { label: __('Left', '__TEXT_DOMAIN__'), value: 'left' },
];

// One line of an office or contact group: an optional icon, then the field.
// A 20px icon and a 12px gap equal the 2rem an indented continuation line
// uses, so both lines' text lands on the same left edge, as on the front end.
function LineField({ label, value, onChange, placeholder, indent, icon, visible }) {
  if (!visible) return null;

  return (
    <p className={`location__line m-0 text-[color:var(--color-ink)] ${icon ? 'flex gap-3' : ''} ${indent ? 'pl-8' : ''}`}>
      {icon ? <img src={icon} alt="" aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /> : null}
      <InlineField label={label} value={value} onChange={onChange} placeholder={placeholder} className="min-w-0 flex-1" />
    </p>
  );
}

const isNumericInRange = (rawValue, min, max) => {
  const raw = String(rawValue ?? '').trim();

  return raw !== '' && !Number.isNaN(Number(raw)) && Number(raw) >= min && Number(raw) <= max;
};

registerBlockType(metadata, {
  edit({ attributes, setAttributes, isSelected, clientId }) {
    const blockProps = useBlockProps();
    const {
      isPreview,
      ground,
      city,
      officeLabel,
      addressLine1,
      addressLine2,
      phone,
      fax,
      contactLabel,
      contactName,
      contactRole,
      contactPhone,
      email,
      latitude,
      longitude,
      zoom,
      ctaText,
      ctaLink,
      ctaIcon,
      ctaIconPosition,
      mediaPosition,
      sectionDivider,
    } = attributes;
    const resolvedDivider = sectionDivider || 'none';

    // Editor-only state: which empty group an editor asked to see. Never saved.
    const [forceShowOffice, setForceShowOffice] = useState(false);
    const [forceShowContact, setForceShowContact] = useState(false);

    // Comma-joined for the geocoder, which reads better as a written address.
    const geocodeAddress = [addressLine1, addressLine2].filter(Boolean).join(', ');
    const locator = useLocator({
      address: geocodeAddress,
      onFound: (coordinates) => setAttributes(coordinates),
    });

    if (isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Location preview', '__TEXT_DOMAIN__')}
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
          />
        </div>
      );
    }

    // Mirrors block.php's own groups: the label alone doesn't make a group,
    // so an editor never sees a contact group the front end leaves out.
    const hasOffice = Boolean(officeLabel || addressLine1 || addressLine2 || phone || fax);
    const hasContact = Boolean(contactName || contactRole || contactPhone || email);
    const showOffice = hasOffice || forceShowOffice;
    const showContact = hasContact || forceShowContact;
    const mapLabel = [addressLine1, addressLine2].filter(Boolean).join(' ').trim() || city || '';
    const hasValidCoordinates = isNumericInRange(latitude, -90, 90) && isNumericInRange(longitude, -180, 180);

    // An empty stored URL plus a real address is a complete destination:
    // block.php builds a directions link from the address (CTA-9).
    const hasDestination = Boolean(ctaLink?.url || addressLine1 || addressLine2);
    const buttonLink = ctaLink?.url ? ctaLink : { ...ctaLink, url: hasDestination ? 'directions' : '' };
    const hasCta = Boolean(ctaText) && hasDestination;
    const showDetails = hasOffice || hasContact || hasCta || isSelected;
    const mediaFirst = mediaPosition === 'left';

    const entrance = resolveEntrance(attributes.entrance, metadata.attributes.entrance?.default);
    const part = partIndexes({
      city: Boolean(city) || isSelected || !showDetails,
      office: showOffice,
      contact: showContact,
      cta: hasCta || isSelected,
      media: hasValidCoordinates || isSelected,
    });

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Map', '__TEXT_DOMAIN__')} initialOpen={false}>
            <div>
              <span style={stackedStyles.label}>{__('Address', '__TEXT_DOMAIN__')}</span>
              <input
                type="text"
                aria-label={__('Map address line 1', '__TEXT_DOMAIN__')}
                value={addressLine1 || ''}
                onChange={(event) => setAttributes({ addressLine1: event.target.value })}
                placeholder={__('Address line 1', '__TEXT_DOMAIN__')}
                style={stackedStyles.input}
              />
              <input
                type="text"
                aria-label={__('Map address line 2', '__TEXT_DOMAIN__')}
                value={addressLine2 || ''}
                onChange={(event) => setAttributes({ addressLine2: event.target.value })}
                placeholder={__('Address line 2', '__TEXT_DOMAIN__')}
                style={stackedStyles.input}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button variant="secondary" onClick={locator.locate}>
                  {__('Locate', '__TEXT_DOMAIN__')}
                </Button>
                <span role="status" aria-live="polite" style={{ fontSize: '12px', color: '#1e1e1e' }}>
                  {locator.status}
                </span>
              </div>
              <p style={{ ...stackedStyles.label, marginTop: '8px', textTransform: 'none', letterSpacing: 0 }}>
                {__('Turns the address above into coordinates, and stores them.', '__TEXT_DOMAIN__')}
              </p>
            </div>

            <div style={{ ...stackedStyles.group, marginTop: '20px' }}>
              <label style={stackedStyles.label}>
                {__('Latitude', '__TEXT_DOMAIN__')}
                <input
                  type="text"
                  aria-label={__('Latitude', '__TEXT_DOMAIN__')}
                  value={latitude}
                  onChange={(event) => {
                    locator.invalidate();
                    setAttributes({ latitude: event.target.value });
                  }}
                  placeholder={__('For example, 37.4869', '__TEXT_DOMAIN__')}
                  style={stackedStyles.input}
                />
              </label>
              <label style={stackedStyles.label}>
                {__('Longitude', '__TEXT_DOMAIN__')}
                <input
                  type="text"
                  aria-label={__('Longitude', '__TEXT_DOMAIN__')}
                  value={longitude}
                  onChange={(event) => {
                    locator.invalidate();
                    setAttributes({ longitude: event.target.value });
                  }}
                  placeholder={__('For example, -122.2297', '__TEXT_DOMAIN__')}
                  style={stackedStyles.input}
                />
              </label>
            </div>

            <div style={{ marginTop: '24px' }}>
              <RangeControl
                label={__('Map zoom', '__TEXT_DOMAIN__')}
                value={zoom}
                min={1}
                max={21}
                onChange={(value) => setAttributes({ zoom: value || 15 })}
                __nextHasNoMarginBottom
              />
            </div>
          </PanelBody>

          <PanelBody title={__('Section', '__TEXT_DOMAIN__')} initialOpen={false}>
            <GroundSelect value={ground} onChange={(value) => setAttributes({ ground: value })} />
            <SelectControl
              label={__('Map side', '__TEXT_DOMAIN__')}
              value={mediaPosition}
              options={MEDIA_POSITIONS}
              onChange={(value) => setAttributes({ mediaPosition: value })}
              __nextHasNoMarginBottom
            />
            <DividerControl value={resolvedDivider} onChange={(value) => setAttributes({ sectionDivider: value })} />
          </PanelBody>

        </InspectorControls>

        <EntranceControl attributes={attributes} setAttributes={setAttributes} clientId={clientId} />

        <EditorSection
          slug="location"
          ground={ground}
          sectionDivider={resolvedDivider}
          entrance={entrance}
          data-media-position={mediaPosition}
        >
          <div className={`flex flex-col items-stretch gap-10 xl:items-start xl:gap-12 ${mediaFirst ? 'xl:flex-row-reverse' : 'xl:flex-row'}`}>
            <div className="max-w-full min-w-0 xl:flex-[0_1_35.8125rem]">
              {part.city !== null && (
                <InlineHeading
                  {...entrancePartProps(entrance, part.city)}
                  tier="section"
                  headingClass="location__city heading-2"
                  label={__('City', '__TEXT_DOMAIN__')}
                  value={city}
                  placeholder={__('Add a city', '__TEXT_DOMAIN__')}
                  onChange={(value) => setAttributes({ city: value })}
                />
              )}

              {showDetails && (
                <div className={`${city ? 'mt-12' : ''} flex flex-col gap-8`}>
                  {showOffice ? (
                    <div {...entrancePartProps(entrance, part.office)} className="location__group">
                      {(officeLabel || isSelected) && (
                        <InlineField
                          label={__('Office name', '__TEXT_DOMAIN__')}
                          value={officeLabel}
                          onChange={(value) => setAttributes({ officeLabel: value })}
                          placeholder={__('Add the office name', '__TEXT_DOMAIN__')}
                          className="font-bold"
                        />
                      )}
                      <div className={officeLabel ? 'mt-3' : ''}>
                        <LineField
                          label={__('Address line 1', '__TEXT_DOMAIN__')}
                          value={addressLine1}
                          onChange={(value) => setAttributes({ addressLine1: value })}
                          placeholder={__('Add the street address', '__TEXT_DOMAIN__')}
                          icon={locationMarkerIcon}
                          visible={Boolean(addressLine1) || isSelected}
                        />
                        <LineField
                          label={__('Address line 2', '__TEXT_DOMAIN__')}
                          value={addressLine2}
                          onChange={(value) => setAttributes({ addressLine2: value })}
                          placeholder={__('Add city, state and ZIP', '__TEXT_DOMAIN__')}
                          indent
                          visible={Boolean(addressLine2) || isSelected}
                        />
                        <LineField
                          label={__('Phone', '__TEXT_DOMAIN__')}
                          value={phone}
                          onChange={(value) => setAttributes({ phone: value })}
                          placeholder={__('Add a phone number', '__TEXT_DOMAIN__')}
                          icon={phoneIcon}
                          visible={Boolean(phone) || isSelected}
                        />
                        <LineField
                          label={__('Fax', '__TEXT_DOMAIN__')}
                          value={fax}
                          onChange={(value) => setAttributes({ fax: value })}
                          placeholder={__('Add a fax number', '__TEXT_DOMAIN__')}
                          icon={newspaperIcon}
                          visible={Boolean(fax) || isSelected}
                        />
                      </div>
                    </div>
                  ) : isSelected ? (
                    <AddPrompt label={__('Add office details', '__TEXT_DOMAIN__')} onClick={() => setForceShowOffice(true)} />
                  ) : null}

                  {showContact ? (
                    <div {...entrancePartProps(entrance, part.contact)} className="location__group">
                      {(contactLabel || isSelected) && (
                        <InlineField
                          label={__('Contact label', '__TEXT_DOMAIN__')}
                          value={contactLabel}
                          onChange={(value) => setAttributes({ contactLabel: value })}
                          placeholder={__('Add a label', '__TEXT_DOMAIN__')}
                          className="font-bold"
                        />
                      )}
                      <div className={contactLabel ? 'mt-3' : ''}>
                        <LineField
                          label={__('Contact name', '__TEXT_DOMAIN__')}
                          value={contactName}
                          onChange={(value) => setAttributes({ contactName: value })}
                          placeholder={__('Add a name', '__TEXT_DOMAIN__')}
                          icon={userCircleIcon}
                          visible={Boolean(contactName) || isSelected}
                        />
                        <LineField
                          label={__('Contact role', '__TEXT_DOMAIN__')}
                          value={contactRole}
                          onChange={(value) => setAttributes({ contactRole: value })}
                          placeholder={__('Add a role', '__TEXT_DOMAIN__')}
                          indent
                          visible={Boolean(contactRole) || isSelected}
                        />
                        <LineField
                          label={__('Contact phone', '__TEXT_DOMAIN__')}
                          value={contactPhone}
                          onChange={(value) => setAttributes({ contactPhone: value })}
                          placeholder={__('Add a phone number', '__TEXT_DOMAIN__')}
                          icon={phoneIcon}
                          visible={Boolean(contactPhone) || isSelected}
                        />
                        <LineField
                          label={__('Contact email', '__TEXT_DOMAIN__')}
                          value={email}
                          onChange={(value) => setAttributes({ email: value })}
                          placeholder={__('Add an email address', '__TEXT_DOMAIN__')}
                          icon={mailIcon}
                          visible={Boolean(email) || isSelected}
                        />
                      </div>
                    </div>
                  ) : isSelected ? (
                    <AddPrompt label={__('Add contact details', '__TEXT_DOMAIN__')} onClick={() => setForceShowContact(true)} />
                  ) : null}

                  <div {...entrancePartProps(entrance, part.cta)}>
                    <CtaPreview
                      className="location__cta self-start"
                      text={ctaText}
                      link={buttonLink}
                      icon={ctaIcon}
                      iconPosition={ctaIconPosition}
                      ground={ground}
                      isSelected={isSelected}
                    />
                    {/* The button is edited on the canvas, never in the sidebar. */}
                    {isSelected && (
                      <ActionEditor
                        groupLabel={__('Directions button editing', '__TEXT_DOMAIN__')}
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
                    {isSelected && (
                      <p className="m-0 mt-2 text-small text-[color:var(--color-muted)]">
                        {__('Leave the destination empty and it points at Google Maps directions for the address above.', '__TEXT_DOMAIN__')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {part.media !== null && (
              <div {...entrancePartProps(entrance, part.media)} className="max-w-full min-w-0 xl:flex-[0_1_37.375rem]">
                <InfoPanel
                  title={__('Map loads here', '__TEXT_DOMAIN__')}
                  data-map-state={hasValidCoordinates ? 'ready' : 'needs-coordinates'}
                >
                  <p style={INFO_PANEL_TEXT_STYLE}>
                    {hasValidCoordinates
                      ? __('A map draws here on the page.', '__TEXT_DOMAIN__')
                      : __('Add coordinates in the Map panel to show a map here.', '__TEXT_DOMAIN__')}
                  </p>
                  {hasValidCoordinates && mapLabel ? <p style={{ ...INFO_PANEL_TEXT_STYLE, marginTop: '4px' }}>{mapLabel}</p> : null}
                </InfoPanel>
              </div>
            )}
          </div>
        </EditorSection>
      </>
    );
  },

  save: () => null,
});
