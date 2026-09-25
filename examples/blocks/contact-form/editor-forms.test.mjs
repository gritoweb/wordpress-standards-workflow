import assert from 'node:assert/strict';
import { test } from 'node:test';

import { executeBundle } from '../../../theme/scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../theme/scripts/wp-editor-stubs.mjs';

const I18N = `
export function __(value) { return value; }
export function sprintf(format, ...args) {
  let i = 0;
  return format.replace(/%d|%s/g, () => args[i++]);
}
`;

resetWpEditorTest();
const { parseForms, formOptions, previewFields, fetchForms, fetchFormFields } = await executeBundle(
  new URL('./editor-forms.js', import.meta.url).pathname,
  wpEditorStubs({ '@wordpress/i18n': I18N }),
  'EditorFormsBundle',
);

test('the forms list is read from an object keyed by id or from an array, sorted by name', () => {
  const rows = [{ id: '3', title: 'Support' }, { id: '2', title: 'Contact us' }];

  assert.deepEqual(parseForms({ 3: rows[0], 2: rows[1] }), [
    { id: 2, title: 'Contact us' },
    { id: 3, title: 'Support' },
  ]);
  assert.deepEqual(parseForms(rows).map((form) => form.id), [2, 3]);
  assert.deepEqual(parseForms(null), []);
  assert.deepEqual(parseForms([{ title: 'No id' }, 'junk']), []);
});

test('the select lists every form by name, and keeps a saved form that is no longer in the list', () => {
  const forms = [{ id: 2, title: 'Contact us' }, { id: 4, title: '' }];

  assert.deepEqual(
    formOptions(forms, 2).map((option) => option.label),
    ['Choose a form', 'Contact us', 'Form 4'],
  );

  const missing = formOptions(forms, 9);
  assert.equal(missing.at(-1).value, 9);
  assert.equal(missing.at(-1).label, 'Missing (ID 9)');
  assert.equal(formOptions(forms, 0).length, 3);
});

test('the field preview keeps the fields an editor fills in, by label, and drops layout-only ones', () => {
  const fields = previewFields({
    fields: [
      { id: 1, type: 'text', label: 'Name', isRequired: true },
      { id: 2, type: 'section', label: 'About you' },
      { id: 3, type: 'email', label: 'Email', adminLabel: 'Work email' },
      { id: 4, type: 'html', content: '<p>x</p>' },
      { id: 5, type: 'captcha' },
    ],
  });

  assert.deepEqual(fields, [
    { id: 1, label: 'Name', type: 'text', required: true },
    { id: 3, label: 'Work email', type: 'email', required: false },
  ]);
  assert.deepEqual(previewFields(null), []);
});

test('a site without Gravity Forms answers null, so the editor offers the shortcode', async () => {
  const failing = () => Promise.reject(new Error('rest_no_route'));

  assert.equal(await fetchForms(failing), null);
  assert.equal(await fetchFormFields(failing, 5), null);
});

test('the loaders ask the Gravity Forms REST routes', async () => {
  const paths = [];
  const apiFetch = ({ path }) => {
    paths.push(path);
    return Promise.resolve(path.endsWith('/5') ? { fields: [{ id: 1, type: 'text', label: 'Name' }] } : { 5: { id: 5, title: 'Contact' } });
  };

  assert.deepEqual(await fetchForms(apiFetch), [{ id: 5, title: 'Contact' }]);
  assert.equal((await fetchFormFields(apiFetch, 5))[0].label, 'Name');
  assert.deepEqual(paths, ['/gf/v2/forms', '/gf/v2/forms/5']);
});
