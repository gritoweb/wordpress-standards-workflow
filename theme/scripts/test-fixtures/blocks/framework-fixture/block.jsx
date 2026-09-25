import { getBlockType, registerBlockType } from '@wordpress/blocks';
import { InspectorControls, RichText, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import { DividerControl } from '../../../../resources/blocks/components/backend/DividerControl.jsx';
import { EntranceControl } from '../../../../resources/blocks/components/backend/EntranceControl.jsx';
import { resolveEntrance, entranceRootProps, entrancePartProps } from '../../../../resources/blocks/components/backend/entranceCanvas.js';
import metadata from './block.json';

// Editor half of the framework's end-to-end fixture: EntranceControl and
// DividerControl are the shared components, wired to real block attributes —
// this proves the inspector round trip, not just each component in isolation.
registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    const { heading, sectionDivider } = attributes;

    // Same wiring `create-block`'s template generates (see "Entrance
    // preset" > "Canvas" in that skill) — without it, replayEntrance()
    // (EntranceControl's Preview button) has no [data-entrance] root to
    // find, and the canvas ignores per-block duration/distance overrides.
    const entrance = resolveEntrance(attributes.entrance, getBlockType(metadata.name)?.attributes?.entrance?.default);
    const blockProps = useBlockProps(entranceRootProps(entrance));

    return (
      <>
        <InspectorControls>
          <DividerControl
            value={sectionDivider}
            onChange={(value) => setAttributes({ sectionDivider: value })}
          />
        </InspectorControls>
        <EntranceControl attributes={attributes} setAttributes={setAttributes} clientId={clientId} />

        <section {...blockProps}>
          <RichText
            tagName="h2"
            {...entrancePartProps(entrance, 0)}
            value={heading}
            onChange={(value) => setAttributes({ heading: value })}
            placeholder={__('Heading', 'kit')}
          />
        </section>
      </>
    );
  },
  save: () => null,
});
