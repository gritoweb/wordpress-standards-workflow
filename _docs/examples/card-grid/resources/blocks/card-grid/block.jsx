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
import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
import { ActionEditor } from '../components/backend/ActionEditor.jsx';
import { ItemList } from '../components/backend/ItemList.jsx';
import { moveItem } from '../components/backend/moveItem.js';
import { useAttachmentUrls } from '../components/backend/useAttachmentUrls.js';
import { PaddingControls } from '../components/backend/PaddingControls.jsx';
import { editorPaddingClasses } from '../components/backend/padding-presets.js';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import {
  resolveEntrance,
  entranceRootProps,
  entrancePartProps,
} from '../components/backend/entranceCanvas.js';
import {
  EDITOR_BLOCK_FRAME,
  emptyLink,
} from '../components/backend/editorCanvas.js';
import previewImage from './preview.svg';
import metadata from './block.json';

const emptyCard = () => ({
  title: '',
  body: '',
  imageId: 0,
  linkText: '',
  link: emptyLink(),
});

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    // Hooks run before the preview return, so their order never changes.
    const [editingLink, setEditingLink] = useState(null);
    const blockProps = useBlockProps();
    const cards = Array.isArray(attributes.cards) ? attributes.cards : [];
    const thumbs = useAttachmentUrls(
      cards.map((card) => Number(card.imageId) || 0),
    );

    if (attributes.isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Card Grid preview', '<text-domain>')}
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
    const updateCard = (index, patch) =>
      setAttributes({
        cards: cards.map((card, i) =>
          i === index ? { ...card, ...patch } : card,
        ),
      });
    const removeCard = (index) => {
      setAttributes({ cards: cards.filter((_, i) => i !== index) });
      setEditingLink(null);
    };

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Cards', '<text-domain>')} initialOpen>
            <ItemList
              items={cards}
              selectable={false}
              onAdd={() => setAttributes({ cards: [...cards, emptyCard()] })}
              onRemove={removeCard}
              onMove={(from, to) =>
                setAttributes({ cards: moveItem(cards, from, to) })
              }
              getLabel={(card) => card.title}
              getThumb={(card) => thumbs[Number(card.imageId)] || ''}
              addButtonLabel={__('+ Add card', '<text-domain>')}
              itemLabelPrefix={__('Card', '<text-domain>')}
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} card-grid bg-light ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...rootEntrance.style,
          }}
        >
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <AutoGrowingTextarea
              {...entrancePartProps(entrance, 0)}
              value={attributes.title}
              onChange={(value) => setAttributes({ title: value })}
              heading
              placeholder={__('Section title…', '<text-domain>')}
              className="heading-2 text-center"
            />
            <div {...entrancePartProps(entrance, 1)}>
              <RichText
                tagName="div"
                value={attributes.description}
                onChange={(value) => setAttributes({ description: value })}
                placeholder={__('Optional description…', '<text-domain>')}
                className="text-body text-muted mt-4"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {cards.map((card, index) => (
              <article
                key={index}
                {...entrancePartProps(entrance, index + 2)}
                className="card flex flex-col overflow-hidden"
              >
                <AttachmentImageControl
                  imageId={card.imageId}
                  onSelect={(media) =>
                    updateCard(index, { imageId: Number(media.id) || 0 })
                  }
                  onRemove={() => updateCard(index, { imageId: 0 })}
                  height="220px"
                />

                <div className="flex flex-1 flex-col p-6">
                  <AutoGrowingTextarea
                    value={card.title}
                    onChange={(value) => updateCard(index, { title: value })}
                    heading
                    placeholder={__('Card title…', '<text-domain>')}
                    className="heading-5"
                  />
                  <RichText
                    tagName="div"
                    value={card.body}
                    onChange={(value) => updateCard(index, { body: value })}
                    placeholder={__('Card text…', '<text-domain>')}
                    className="text-small text-muted mt-3"
                  />

                  <span
                    role="button"
                    tabIndex={0}
                    className="text-small text-primary mt-auto inline-flex cursor-pointer pt-5 font-semibold"
                    onClick={() =>
                      setEditingLink(editingLink === index ? null : index)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setEditingLink(editingLink === index ? null : index);
                      }
                    }}
                  >
                    {card.linkText || __('+ Add link', '<text-domain>')}
                  </span>

                  {editingLink === index && (
                    <div className="w-full">
                      <ActionEditor
                        groupLabel={`${__('Card link', '<text-domain>')} ${index + 1}`}
                        label={__('Link text', '<text-domain>')}
                        linkLabel={__('Link destination', '<text-domain>')}
                        text={card.linkText}
                        link={card.link}
                        stacked
                        onTextChange={(value) =>
                          updateCard(index, { linkText: value })
                        }
                        onLinkChange={(value) =>
                          updateCard(index, { link: value })
                        }
                      />
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </>
    );
  },

  save: () => null,
});
