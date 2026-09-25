import { __, sprintf } from '@wordpress/i18n';
import { emptyLink } from './editorCanvas.js';
import { LinkPicker } from './LinkPicker.jsx';

// Inline so the panel never depends on a theme class; it matches the two-column panel (rounded-lg bg-white p-4 shadow-sm).
export const stackedStyles = {
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '12px',
    padding: '16px',
    borderRadius: '8px',
    background: '#fff',
    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    color: '#1e1e1e',
    textAlign: 'left',
  },
  label: {
    display: 'block',
    margin: 0,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#757575',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: 0,
    fontSize: '12px',
    fontWeight: 400,
    textTransform: 'none',
    letterSpacing: 0,
    color: '#1e1e1e',
  },
  input: {
    display: 'block',
    boxSizing: 'border-box',
    width: '100%',
    minHeight: '46px',
    marginTop: '4px',
    padding: '8px 12px',
    border: '1px solid #949494',
    borderRadius: '2px',
    background: '#fff',
    fontSize: '13px',
    fontWeight: 400,
    color: '#1e1e1e',
  },
};

export const CTA_ICON_OPTIONS = [
  { value: 'none', label: __('None', '__TEXT_DOMAIN__') },
  { value: 'arrow', label: __('Arrow', '__TEXT_DOMAIN__') },
  { value: 'external', label: __('External link', '__TEXT_DOMAIN__') },
  { value: 'download', label: __('Download', '__TEXT_DOMAIN__') },
];

/**
 * Classes the front end puts on a button for its icon. Absent or unknown
 * attributes mean no icon, so an untouched post renders as before. Twin of
 * BlockAttributes::ctaIconClass() in PHP.
 */
export function ctaIconClass(icon, position) {
  if (!['arrow', 'external', 'download'].includes(icon)) {
    return '';
  }

  return `btn-icon-${icon}${position === 'before' ? ' btn-icon-before' : ''}`;
}

const positionButton = (active) => ({
  flex: 1,
  minHeight: '36px',
  border: '1px solid #949494',
  background: active ? '#1e1e1e' : '#fff',
  color: active ? '#fff' : '#1e1e1e',
  fontSize: '13px',
  cursor: 'pointer',
});

/**
 * Paired label and destination fields for one action, always on the canvas
 * (never in InspectorControls). `stacked` is one column for a narrow container
 * such as a grid card; the default is two columns for a full-width CTA. The
 * link opens LinkControl in a Popover: inline on the canvas, the theme CSS
 * breaks LinkControl's preview row.
 */
export function ActionEditor({
  groupLabel,
  label,
  linkLabel,
  text,
  link,
  stacked = false,
  icon,
  iconPosition,
  onTextChange,
  onLinkChange,
  onIconChange,
  onIconPositionChange,
}) {
  const hasIcon = ctaIconClass(icon, iconPosition) !== '';

  return (
    <div
      role="group"
      aria-label={groupLabel}
      className={
        stacked
          ? undefined
          : 'mt-3 grid gap-3 rounded-lg bg-white p-4 text-gray-900 shadow-sm sm:grid-cols-2'
      }
      style={stacked ? stackedStyles.group : undefined}
    >
      <label
        className={
          stacked
            ? undefined
            : 'm-0 block text-xs font-bold text-[color:var(--color-ink,#1e1e1e)]'
        }
        style={stacked ? stackedStyles.label : undefined}
      >
        {label}
        <input
          type="text"
          aria-label={label}
          value={text || ''}
          onChange={(event) => onTextChange(event.target.value)}
          className={
            stacked
              ? undefined
              : 'mt-1 min-h-11 w-full rounded border border-gray-300 bg-white px-3 py-2 text-base font-normal text-gray-900'
          }
          style={stacked ? stackedStyles.input : undefined}
        />
      </label>
      <div>
        <LinkPicker
          label={linkLabel}
          value={link || emptyLink()}
          onChange={onLinkChange}
        />
        {/* The picker's LinkControl has no toggle of its own here, so the
            flag sits directly under it. Every renderer that reads
            opensInNewTab already emits target="_blank" from it. */}
        <label
          className={
            stacked ? undefined : 'mt-2 flex items-center gap-2 text-xs'
          }
          style={stacked ? stackedStyles.checkbox : undefined}
        >
          <input
            type="checkbox"
            aria-label={sprintf(
              /* translators: %s: the link's own label, e.g. 'CTA link'. */
              __('Open %s in a new tab', '__TEXT_DOMAIN__'),
              linkLabel,
            )}
            checked={Boolean(link?.opensInNewTab)}
            onChange={(event) =>
              onLinkChange({
                ...(link || emptyLink()),
                opensInNewTab: event.target.checked,
              })
            }
          />
          {__('Open in a new tab', '__TEXT_DOMAIN__')}
        </label>
      </div>
      {onIconChange && (
        <div>
          <label style={stackedStyles.label}>
            {__('Icon', '__TEXT_DOMAIN__')}
            <select
              value={hasIcon ? icon : 'none'}
              onChange={(event) => onIconChange(event.target.value)}
              style={stackedStyles.input}
            >
              {CTA_ICON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {hasIcon && (
            <div
              role="group"
              aria-label={__('Icon position', '__TEXT_DOMAIN__')}
              style={{ display: 'flex', marginTop: '8px' }}
            >
              {['after', 'before'].map((value) => {
                const active =
                  (iconPosition === 'before') === (value === 'before');

                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onIconPositionChange(value)}
                    style={positionButton(active)}
                  >
                    {value === 'before'
                      ? __('Before label', '__TEXT_DOMAIN__')
                      : __('After label', '__TEXT_DOMAIN__')}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
