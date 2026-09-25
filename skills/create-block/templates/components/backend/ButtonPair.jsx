import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ActionEditor } from './ActionEditor.jsx';

/**
 * A section button on the canvas: the preview carries the button's own classes and opens ActionEditor on click, never on select.
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
  const toggle = () => setEditing(!editing);

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        className={`${className} cursor-pointer`}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggle();
          }
        }}
      >
        {text || addLabel}
      </span>
      {editing && (
        <div className="w-full max-w-xl text-left">
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
      )}
    </>
  );
}
