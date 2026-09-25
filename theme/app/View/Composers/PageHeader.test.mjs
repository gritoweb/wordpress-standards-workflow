import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { appRoot, callKitPhp } from '../../test-support.mjs';

const ACORN_COMPOSER_STUB = "namespace Roots\\Acorn\\View; class Composer {}";

const REQUIRES = [resolve(appRoot, 'View/Composers/PageHeader.php')];

const pageHeader = ({ singular = false, archive = false, archiveDescription = '' } = {}) =>
  callKitPhp('__test_page_header_with', [], {
    requires: REQUIRES,
    functions: [
      ACORN_COMPOSER_STUB,
      `function is_singular() { return ${singular ? 'true' : 'false'}; }`,
      `function is_archive() { return ${archive ? 'true' : 'false'}; }`,
      `function get_the_archive_description() { return ${JSON.stringify(archiveDescription)}; }`,
      'function __test_page_header_with() { return (new \\App\\View\\Composers\\PageHeader())->with(); }',
    ],
  });

test('a singular template (a page, a post) gets a visually hidden title and no subtitle', () => {
  const result = pageHeader({ singular: true, archive: true, archiveDescription: 'Should not appear' });

  assert.equal(result.visibleTitle, false);
  assert.equal(result.subtitle, '');
});

test('a non-singular template (the blog index, 404) gets a visible title', () => {
  const result = pageHeader({ singular: false });

  assert.equal(result.visibleTitle, true);
});

test('an archive with a description shows it as the subtitle, tags stripped', () => {
  const result = pageHeader({ singular: false, archive: true, archiveDescription: '<p>Every <b>service</b> we offer.</p>' });

  assert.equal(result.subtitle, 'Every service we offer.');
});

test('a non-archive visible-title template (the blog index) has no subtitle', () => {
  const result = pageHeader({ singular: false, archive: false });

  assert.equal(result.subtitle, '');
});

test('an archive with no description has no subtitle', () => {
  const result = pageHeader({ singular: false, archive: true, archiveDescription: '' });

  assert.equal(result.subtitle, '');
});
