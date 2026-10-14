import { Popover } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ActionEditor } from './ActionEditor.jsx';

/**
 * A section button on the canvas: the preview carries the button's own classes and opens ActionEditor in a Popover below it on click, never on select.
 */
export function ButtonPair({
  text,
  link,
  onTextChange,
  onLinkChange,
  className = 'btn btn-primary',
  addLabel = __('+ Add button', '__TEXT_DOMAIN__'),
}) {
  const [editing, setEditing] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const open = () => setEditing(true);

  return (
    <>
      <span
        ref={setAnchor}
        role="button"
        tabIndex={0}
        className={`${className} cursor-pointer`}
        aria-expanded={editing}
        onClick={open}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        }}
      >
        {text || addLabel}
      </span>
      {/* The Popover renders in the admin document, where core's LinkControl has its stylesheet; inline in the canvas iframe it lays out unstyled. */}
      {editing && (
        <Popover
          anchor={anchor}
          placement="bottom-start"
          offset={8}
          focusOnMount="firstElement"
          onClose={() => setEditing(false)}
        >
          <div style={{ width: '24rem', maxWidth: '100%', textAlign: 'left' }}>
            <ActionEditor
              groupLabel={__('Button', '__TEXT_DOMAIN__')}
              label={__('Button text', '__TEXT_DOMAIN__')}
              linkLabel={__('Button link', '__TEXT_DOMAIN__')}
              text={text}
              link={link}
              onTextChange={onTextChange}
              onLinkChange={onLinkChange}
            />
          </div>
        </Popover>
      )}
    </>
  );
}
