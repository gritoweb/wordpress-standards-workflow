import { LinkControl } from '@wordpress/block-editor';
import { useId, useState } from '@wordpress/element';
import { Button, Popover } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Link picker wrapping Gutenberg's stock <LinkControl>.
 *
 * With `fullWidth` (the inspector) the control renders inline, always
 * visible: a popover there opens in the narrow sidebar against the browser
 * edge and shifts its scroll. Without it (the canvas) a trigger button opens
 * the control in a <Popover>, since the canvas has no room for it inline.
 *
 * `value` is the standard LinkControl shape — an object with at least
 * `{ url, opensInNewTab }` (plus any extra flags exposed via `settings`,
 * e.g. `nofollow`). Pass it through to/from a block attribute declared
 * as `"type": "object"` in block.json.
 *
 * `onChange` receives the merged value object. `onRemove` resets to an
 * empty link.
 *
 * `settings` is forwarded to LinkControl unchanged — pass `undefined`
 * to use Gutenberg's default (`opensInNewTab` only), or pass an array
 * like `[{id:'opensInNewTab',title:'Open in new tab'},{id:'nofollow',title:'Mark as nofollow'}]`
 * to expose more toggles.
 *
 * Render side: emit `target="_blank"` when `opensInNewTab` is true; WP
 * core's `wp_targeted_link_rel()` filter auto-adds `rel="noopener"` to
 * the final output, so don't hardcode rel attributes from the block.
 *
 * Visual: the trigger button is sized to match the
 * `<div className="p-3 border border-gray-300 rounded bg-white">` input
 * wrapper used by sibling text fields (~46px), so a CTA text input and
 * a CTA link picker line up in a `flex` row.
 *
 * `fullWidth` opts into the inline control and inline styles instead of
 * Tailwind. Pass it from the inspector sidebar, which renders in the
 * admin document that `editor.css` never reaches. It defaults to false,
 * so every canvas call site renders unchanged.
 */
if (typeof window !== 'undefined' && window.HTMLElement) {
  const nativeCheck = Function.prototype[Symbol.hasInstance];

  Object.defineProperty(window.HTMLElement, Symbol.hasInstance, {
    // Subclasses inherit this static, so only HTMLElement itself is widened.
    // Otherwise a div would pass `instanceof HTMLInputElement` in core code.
    value(instance) {
      if (this !== window.HTMLElement) {
        return nativeCheck.call(this, instance);
      }

      return !!(
        instance &&
        typeof instance === 'object' &&
        instance.nodeType === 1 &&
        // An SVG or MathML element is nodeType 1 too; namespaceURI is the same in every realm.
        (instance.namespaceURI == null ||
          instance.namespaceURI === 'http://www.w3.org/1999/xhtml')
      );
    },
    configurable: true,
  });
}

// Core sets min-width: 350px on the link control, wider than the 280px inspector; scoped to this wrapper.
const INSPECTOR_LINK_CONTROL_CSS =
  '.link-picker .block-editor-link-control{min-width:0;max-width:100%}';

const fullWidthStyles = {
  wrapper: { position: 'relative', width: '100%', minWidth: 0, maxWidth: '100%' },
  label: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#757575',
  },
  control: { width: '100%', minWidth: 0, boxSizing: 'border-box' },
};

export const LinkPicker = ({
  value,
  onChange,
  onRemove,
  label = '',
  settings,
  className = '',
  fullWidth = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const labelId = useId();
  const url = value?.url || '';

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    } else {
      onChange({ url: '', opensInNewTab: false });
    }
  };

  const control = (
    <LinkControl
      value={value}
      onRemove={handleRemove}
      onChange={(newVal) => onChange({ ...value, ...newVal })}
      settings={settings}
    />
  );

  if (fullWidth) {
    return (
      <div
        className={`link-picker ${className}`.trim()}
        style={fullWidthStyles.wrapper}
      >
        <style>{INSPECTOR_LINK_CONTROL_CSS}</style>
        {label && (
          <label id={labelId} style={fullWidthStyles.label}>
            {label}
          </label>
        )}
        <div
          style={fullWidthStyles.control}
          aria-labelledby={label ? labelId : undefined}
        >
          {control}
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ position: 'relative' }}>
      {label && (
        <label
          id={labelId}
          className="mb-1 block text-[10px] font-bold text-gray-400 uppercase"
        >
          {label}
        </label>
      )}

      <Button
        variant="secondary"
        aria-labelledby={label ? labelId : undefined}
        onClick={() => setIsOpen(!isOpen)}
        className="!min-h-[46px] !w-full !justify-between !rounded !border !border-gray-300 !bg-white !px-3 !text-left !text-gray-700 !shadow-none hover:!bg-gray-50"
      >
        <span className="truncate">{url || __('Select link…', '__TEXT_DOMAIN__')}</span>
      </Button>

      {isOpen && (
        <Popover position="bottom center" onClose={() => setIsOpen(false)}>
          <div style={{ padding: '16px', minWidth: '300px' }}>{control}</div>
        </Popover>
      )}
    </div>
  );
};
