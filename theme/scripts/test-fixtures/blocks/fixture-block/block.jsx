import { registerBlockType } from '@wordpress/blocks';
import { RichText, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

registerBlockType('kit/fixture-block', {
  edit({ attributes, setAttributes }) {
    const blockProps = useBlockProps();

    return (
      <div {...blockProps}>
        <RichText
          tagName="h2"
          value={attributes.heading}
          placeholder={__('Heading')}
          onChange={(heading) => setAttributes({ heading })}
        />
      </div>
    );
  },
  save() {
    return null;
  },
});
