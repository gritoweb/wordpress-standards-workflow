import { __ } from '@wordpress/i18n';
import { InfoPanel } from '../components/backend/InfoPanel.jsx';

const MUTED = 'm-0 text-small text-[color:var(--color-ink)]/70';

// What the canvas shows for the form: never a live input. A Gravity form
// lists its fields by name, and any other form plugin's shortcode shows as
// text (CANVAS-11).
export function FormPreview({ formId, formShortcode, gravity, partProps }) {
  const state = formId > 0 ? 'gravity' : formShortcode ? 'shortcode' : 'unset';
  const chosen = gravity.forms.find((form) => form.id === formId);

  if (state === 'unset') {
    return (
      <p className={MUTED} data-form-state="unset" {...partProps}>
        {__('Choose a form in the Form panel.', '__TEXT_DOMAIN__')}
      </p>
    );
  }

  return (
    <InfoPanel
      role="group"
      aria-label={__('Form loads here', '__TEXT_DOMAIN__')}
      data-form-state={state}
      title={
        state === 'gravity'
          ? __('Gravity Forms form loads here', '__TEXT_DOMAIN__')
          : __('Shortcode form loads here', '__TEXT_DOMAIN__')
      }
      {...partProps}
    >
      {state === 'shortcode' && <p className={MUTED}>{formShortcode}</p>}

      {state === 'gravity' && (
        <>
          <p className={MUTED}>{chosen?.title || `#${formId}`}</p>
          {gravity.fields?.length > 0 && (
            <ul className="m-0 mt-3 list-none p-0 text-small text-[color:var(--color-ink)]" data-form-fields>
              {gravity.fields.map((field, index) => (
                <li key={field.id || index} className="border-t border-[color:var(--color-ink)]/15 py-1.5">
                  {field.label || field.type}
                  {field.required && <span aria-hidden="true"> *</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </InfoPanel>
  );
}
