import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, RangeControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { PostPicker } from '../components/backend/PostPicker.jsx';
import { DividerControl } from '../components/backend/DividerControl.jsx';
import { EditorSection } from '../components/backend/EditorSection.jsx';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import { entrancePartProps, resolveEntrance } from '../components/backend/entranceCanvas.js';
import { GroundSelect } from '../components/backend/GroundSelect.jsx';
import { InfoPanel, INFO_PANEL_TEXT_STYLE } from '../components/backend/InfoPanel.jsx';
import { PagingControls } from '../components/backend/PagingControls.jsx';
import { useCollectionSummary } from '../components/backend/useCollectionSummary.js';
import previewImage from './preview.svg';
import metadata from './block.json';

// Mirrors the types registered with App\Content\ContentTypes::register(). The
// editor never loads that PHP class, so it keeps its own copy of each type's
// slug and label. Add a type in both places; see _docs/content-types.md.
const CONTENT_TYPES = {
  __PREFIX___person: { label: __('People', '__TEXT_DOMAIN__') },
};

const ORDERBY_OPTIONS = [
  { value: 'manual', label: __('Manual', '__TEXT_DOMAIN__') },
  { value: 'title', label: __('Title', '__TEXT_DOMAIN__') },
  { value: 'date', label: __('Newest first', '__TEXT_DOMAIN__') },
];

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    const blockProps = useBlockProps();
    const { isPreview, contentType, columns, orderby, linkText, sectionDivider, ground } = attributes;
    const resolvedDivider = sectionDivider || 'none';
    const entrance = resolveEntrance(attributes.entrance, metadata.attributes.entrance?.default);
    const includeIds = Array.isArray(attributes.includeIds) ? attributes.includeIds : [];
    const excludeIds = Array.isArray(attributes.excludeIds) ? attributes.excludeIds : [];
    const typeOptions = Object.entries(CONTENT_TYPES).map(([value, type]) => ({
      value,
      label: type.label,
    }));

    // The REST response only carries what the type's own ACF group exposes
    // to it (often nothing, see _docs/editor-contract.md, "Collection
    // blocks"), so the canvas counts who is in the grid rather than drawing
    // cards it cannot fill honestly.
    const summary = useCollectionSummary(attributes);

    if (isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Post Grid preview', '__TEXT_DOMAIN__')}
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
          />
        </div>
      );
    }

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Content', '__TEXT_DOMAIN__')} initialOpen={false}>
            <SelectControl
              label={__('Content type', '__TEXT_DOMAIN__')}
              value={contentType}
              options={[
                { value: '', label: __('Choose one…', '__TEXT_DOMAIN__') },
                ...typeOptions,
              ]}
              onChange={(value) => setAttributes({ contentType: value })}
            />
            {contentType && (
              <>
                <div style={{ margin: '16px 0' }}>
                  <PostPicker
                    postType={contentType}
                    value={includeIds}
                    onChange={(next) => setAttributes({ includeIds: next })}
                    label={__('Records to show', '__TEXT_DOMAIN__')}
                    addLabel={__('Add a record', '__TEXT_DOMAIN__')}
                    help={__('Drag a row by its handle to reorder.', '__TEXT_DOMAIN__')}
                    emptyNotice={__('Leave empty to show everyone.', '__TEXT_DOMAIN__')}
                    clearLabel={__('Clear the list and show everyone', '__TEXT_DOMAIN__')}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <PostPicker
                    postType={contentType}
                    value={excludeIds}
                    onChange={(next) => setAttributes({ excludeIds: next })}
                    label={__("Don't show these", '__TEXT_DOMAIN__')}
                    addLabel={__('Add a record to hide', '__TEXT_DOMAIN__')}
                  />
                </div>
                <SelectControl
                  label={__('Sort', '__TEXT_DOMAIN__')}
                  value={orderby}
                  options={ORDERBY_OPTIONS}
                  onChange={(value) => setAttributes({ orderby: value })}
                />
              </>
            )}
          </PanelBody>

          <PanelBody title={__('Layout', '__TEXT_DOMAIN__')} initialOpen={false}>
            <RangeControl
              label={__('Columns', '__TEXT_DOMAIN__')}
              value={columns}
              onChange={(value) => setAttributes({ columns: value ?? 1 })}
              min={1}
              max={4}
            />
            <PagingControls attributes={attributes} setAttributes={setAttributes} />
          </PanelBody>

          <PanelBody title={__('Section', '__TEXT_DOMAIN__')} initialOpen={false}>
            <GroundSelect value={ground} onChange={(value) => setAttributes({ ground: value })} />
            <DividerControl
              value={resolvedDivider}
              onChange={(value) => setAttributes({ sectionDivider: value })}
            />
          </PanelBody>

          <PanelBody title={__('Card', '__TEXT_DOMAIN__')} initialOpen={false}>
            <TextControl
              label={__('Read more link text', '__TEXT_DOMAIN__')}
              help={__('Shown only on a card with a link.', '__TEXT_DOMAIN__')}
              value={linkText}
              onChange={(value) => setAttributes({ linkText: value })}
            />
          </PanelBody>
        </InspectorControls>

        <EntranceControl attributes={attributes} setAttributes={setAttributes} clientId={clientId} />

        <EditorSection slug="post-grid" ground={ground} sectionDivider={resolvedDivider} entrance={entrance}>
          <InfoPanel
            className="post-grid-editor__panel"
            data-collection-state={summary.state}
            title={__('Records load here', '__TEXT_DOMAIN__')}
            {...entrancePartProps(entrance)}
          >
            <p style={INFO_PANEL_TEXT_STYLE}>{summary.message}</p>
            {summary.extra && <p style={{ ...INFO_PANEL_TEXT_STYLE, marginTop: '8px' }}>{summary.extra}</p>}
          </InfoPanel>
        </EditorSection>
      </>
    );
  },

  save: () => null,
});
