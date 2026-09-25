import { registerBlockType } from '@wordpress/blocks';
import {
  useBlockProps,
  InspectorControls,
  RichText,
} from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { AutoGrowingTextarea } from '../components/backend/AutoGrowingTextarea.jsx';
import { ItemList } from '../components/backend/ItemList.jsx';
import { moveItem } from '../components/backend/moveItem.js';
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

const emptyItem = () => ({ value: '', label: '' });

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    const blockProps = useBlockProps();
    const items = Array.isArray(attributes.items) ? attributes.items : [];

    if (attributes.isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Number Grid preview', '<text-domain>')}
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

    // One write per change: two calls in a row would both start from the stale array.
    const updateItem = (index, patch) =>
      setAttributes({
        items: items.map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        ),
      });

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Numbers', '<text-domain>')} initialOpen>
            <ItemList
              items={items}
              selectable={false}
              onAdd={() => setAttributes({ items: [...items, emptyItem()] })}
              onRemove={(index) =>
                setAttributes({ items: items.filter((_, i) => i !== index) })
              }
              onMove={(from, to) =>
                setAttributes({ items: moveItem(items, from, to) })
              }
              getLabel={(item) =>
                [item.value, item.label].filter(Boolean).join(' ')
              }
              addButtonLabel={__('+ Add number', '<text-domain>')}
              itemLabelPrefix={__('Number', '<text-domain>')}
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} number-grid bg-surface ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...rootEntrance.style,
          }}
        >
          <AutoGrowingTextarea
            {...entrancePartProps(entrance, 0)}
            value={attributes.title}
            onChange={(value) => setAttributes({ title: value })}
            heading
            placeholder={__('Section title…', '<text-domain>')}
            className="heading-2 mb-12 text-center"
          />

          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {items.map((item, index) => (
              <div
                key={index}
                {...entrancePartProps(entrance, index + 1)}
                className="text-center"
              >
                <AutoGrowingTextarea
                  value={item.value}
                  onChange={(value) => updateItem(index, { value })}
                  heading
                  placeholder={__('100+', '<text-domain>')}
                  className="heading-1 text-primary text-center"
                />
                <AutoGrowingTextarea
                  value={item.label}
                  onChange={(value) => updateItem(index, { label: value })}
                  placeholder={__('What it counts…', '<text-domain>')}
                  className="text-small text-muted mt-2 text-center"
                />
              </div>
            ))}
          </div>
        </section>
      </>
    );
  },

  save: () => null,
});
