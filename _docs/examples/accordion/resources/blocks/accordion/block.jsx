import { registerBlockType } from '@wordpress/blocks';
import {
  useBlockProps,
  InspectorControls,
  RichText,
} from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { useState } from '@wordpress/element';
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

const emptyItem = () => ({ title: '', body: '' });

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    // Hooks run before the preview return, so their order never changes.
    const [activeItem, setActiveItem] = useState(0);
    const blockProps = useBlockProps();
    const { isPreview, title, description } = attributes;
    const items = Array.isArray(attributes.items) ? attributes.items : [];

    if (isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Accordion preview', '<text-domain>')}
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
    // The open item on the canvas is the one selected in the sidebar list.
    const open = Math.min(activeItem, Math.max(items.length - 1, 0));

    const updateItem = (index, patch) =>
      setAttributes({
        items: items.map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        ),
      });
    const addItem = () => {
      setAttributes({ items: [...items, emptyItem()] });
      setActiveItem(items.length);
    };
    const removeItem = (index) => {
      setAttributes({ items: items.filter((_, i) => i !== index) });
      setActiveItem((current) =>
        Math.max(0, current > index ? current - 1 : current),
      );
    };

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Items', '<text-domain>')} initialOpen>
            <ItemList
              items={items}
              activeItem={open}
              setActiveItem={setActiveItem}
              onAdd={addItem}
              onRemove={removeItem}
              onMove={(from, to) =>
                setAttributes({ items: moveItem(items, from, to) })
              }
              getLabel={(item) => item.title}
              addButtonLabel={__('+ Add question', '<text-domain>')}
              itemLabelPrefix={__('Question', '<text-domain>')}
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} accordion bg-surface ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...rootEntrance.style,
          }}
        >
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <AutoGrowingTextarea
                {...entrancePartProps(entrance, 0)}
                value={title}
                onChange={(value) => setAttributes({ title: value })}
                heading
                placeholder={__('Section title…', '<text-domain>')}
                className="heading-2"
              />
              <div {...entrancePartProps(entrance, 1)}>
                <RichText
                  tagName="div"
                  value={description}
                  onChange={(value) => setAttributes({ description: value })}
                  placeholder={__('Short description…', '<text-domain>')}
                  className="text-body text-muted mt-4"
                />
              </div>
            </div>

            <div className="space-y-3 lg:col-span-7">
              {items.map((item, index) => {
                const isOpen = index === open;

                return (
                  <div
                    key={index}
                    {...entrancePartProps(entrance, index + 2)}
                    className={`card ${isOpen ? 'border-primary/30' : ''}`}
                  >
                    <div
                      className="flex cursor-pointer items-center justify-between gap-4 p-5"
                      onClick={() => setActiveItem(index)}
                    >
                      <AutoGrowingTextarea
                        value={item.title}
                        onChange={(value) =>
                          updateItem(index, { title: value })
                        }
                        onFocus={() => setActiveItem(index)}
                        placeholder={__('Question…', '<text-domain>')}
                        className={`heading-6 ${isOpen ? 'text-primary' : ''}`}
                      />
                      <svg
                        className={`text-muted h-5 w-5 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>

                    {isOpen && (
                      <RichText
                        tagName="div"
                        value={item.body}
                        onChange={(value) => updateItem(index, { body: value })}
                        placeholder={__('Answer…', '<text-domain>')}
                        className="border-border text-small text-muted border-t px-5 pt-3 pb-5"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </>
    );
  },

  save: () => null,
});
