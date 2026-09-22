import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * The one "Divider" select shared by every full-width section block: None,
 * Above the section, Below the section. Every block renders the same yellow
 * rule for Above/Below (`border-t-2`/`border-b-2 border-[color:var(--color-
 * primary)]` on the block's own root element), so the control is shared even
 * though each block resolves its own legacy fallback locally.
 *
 * @param {object}   props
 * @param {string}   props.value    Resolved 'none' | 'above' | 'below'.
 * @param {Function} props.onChange
 */
export function DividerControl({ value, onChange }) {
  return (
    <SelectControl
      label={__('Divider', '__TEXT_DOMAIN__')}
      value={value}
      options={[
        { label: __('None', '__TEXT_DOMAIN__'), value: 'none' },
        { label: __('Above the section', '__TEXT_DOMAIN__'), value: 'above' },
        { label: __('Below the section', '__TEXT_DOMAIN__'), value: 'below' },
      ]}
      onChange={onChange}
    />
  );
}

/**
 * The editor's rule class for a resolved divider value, for the block's own
 * root element. Mirrors the front end's yellow Above/Below rule.
 *
 * @param {string} value 'none' | 'above' | 'below'.
 * @return {string}
 */
export function dividerClass(value) {
  if (value === 'above') {
    return 'border-t-2 border-[color:var(--color-primary)]';
  }
  if (value === 'below') {
    return 'border-b-2 border-[color:var(--color-primary)]';
  }
  return '';
}
