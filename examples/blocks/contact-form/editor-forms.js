import { __, sprintf } from '@wordpress/i18n';

// Gravity Forms' REST API (v2) answers for anyone who can edit forms. On a
// site without the plugin the route doesn't exist and the request fails,
// which is how the editor learns to offer the shortcode instead.
export const FORMS_PATH = '/gf/v2/forms';

// Field types that draw nothing an editor fills in, so the canvas skips them.
const SILENT_TYPES = new Set(['html', 'section', 'page', 'captcha', 'honeypot', 'hidden']);

// The list endpoint answers with an object keyed by form id, or an array in
// some versions. Anything else reads as no forms.
export function parseForms(response) {
  const rows = Array.isArray(response) ? response : Object.values(response ?? {});

  return rows
    .map((row) => ({ id: Number(row?.id) || 0, title: String(row?.title ?? '') }))
    .filter((form) => form.id > 0)
    .sort((a, b) => a.title.localeCompare(b.title));
}

// The select's options: a prompt, every form by name, and the saved form when
// it is no longer in the list (deleted, or the list not loaded yet), so a
// saved choice never silently changes.
export function formOptions(forms, savedId) {
  const options = [
    { label: __('Choose a form', '__TEXT_DOMAIN__'), value: 0 },
    ...forms.map((form) => ({
      label: form.title || sprintf(
        /* translators: %d: a form's ID, shown when the form has no title. */
        __('Form %d', '__TEXT_DOMAIN__'),
        form.id,
      ),
      value: form.id,
    })),
  ];

  if (savedId > 0 && !forms.some((form) => form.id === savedId)) {
    options.push({
      label: sprintf(
        /* translators: %d: the ID of a form that is not in the list. */
        __('Missing (ID %d)', '__TEXT_DOMAIN__'),
        savedId,
      ),
      value: savedId,
    });
  }

  return options;
}

// What the canvas shows of one form: its fields, by label, in order. The
// canvas draws text, never an input an editor could type into (CANVAS-11).
export function previewFields(form) {
  const fields = Array.isArray(form?.fields) ? form.fields : [];

  return fields
    .filter((field) => !SILENT_TYPES.has(field?.type))
    .map((field) => ({
      id: Number(field.id) || 0,
      label: String(field.adminLabel || field.label || ''),
      type: String(field.type || ''),
      required: Boolean(field.isRequired),
    }));
}

// Both loaders take the fetch function as an argument, so a test can pass a
// stand-in for @wordpress/api-fetch. A failed request answers null.
export async function fetchForms(apiFetch) {
  try {
    return parseForms(await apiFetch({ path: FORMS_PATH }));
  } catch {
    return null;
  }
}

export async function fetchFormFields(apiFetch, id) {
  try {
    return previewFields(await apiFetch({ path: `${FORMS_PATH}/${id}` }));
  } catch {
    return null;
  }
}
