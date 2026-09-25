// App\Content\ContentTypes::ADAPTERS and post-grid/block.jsx's CONTENT_TYPES
// constant are the same list, kept in two languages because the editor's
// "Content type" control has to render before any REST call can tell it
// what's registered on the server (see _docs/content-types.md, "Why two
// registries"). This is the one test that proves they agree, instead of a
// second hand-kept list drifting from the first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { callPhp } from '../../../theme/scripts/render-harness.mjs';
import { executeBundle } from '../../../theme/scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../theme/scripts/wp-editor-stubs.mjs';
import { exampleEnv, SAMPLE_CONTENT_TYPES } from '../../test-support.mjs';

const blockEntry = fileURLToPath(new URL('../../blocks/post-grid/block.jsx', import.meta.url));

function phpSide() {
  return callPhp('__test_content_types', [], exampleEnv({
    functions: [
      ...SAMPLE_CONTENT_TYPES,
      "function __test_content_types() { $out = []; foreach (\\App\\Content\\ContentTypes::adapters() as $class) { $out[$class::postType()] = $class::label(); } return $out; }",
    ],
  }));
}

async function jsSide() {
  resetWpEditorTest();
  const dataStub = `export function useSelect(mapSelect) {
    return mapSelect((store) => store === 'core' ? { getEntityRecords: () => null, hasResolutionFailed: () => false } : {});
  }`;
  // PostPicker's ItemList.jsx statically imports useRef/useEffect (Vite
  // resolves the whole module graph regardless of which branch a contentType
  // of '' skips at runtime), so the default @wordpress/element stub (only
  // useState) isn't enough to bundle this block.
  const defaultElement = new Map(wpEditorStubs()).get('@wordpress/element');
  const elementStub = `${defaultElement}
export function useRef(initialValue) { return { current: initialValue }; }
export function useLayoutEffect() {}
export function useEffect() {}`;
  const groundsStub = 'export default { grounds: [] };';
  const i18nStub = `export function __(value) { return value; }
export function _n(single, plural, count) { return count === 1 ? single : plural; }
export function sprintf(format, ...args) {
  let i = 0;
  return format.replace(/%\\d\\$s|%s|%d/g, () => args[i++]);
}`;
  const defaultComponents = new Map(wpEditorStubs()).get('@wordpress/components');
  const componentsStub = `${defaultComponents}
export function Notice(props) { return React.createElement('div', { role: 'status' }, props.children); }`;
  await executeBundle(
    blockEntry,
    wpEditorStubs({
      '@wordpress/data': dataStub,
      '@wordpress/element': elementStub,
      '@wordpress/i18n': i18nStub,
      '@wordpress/components': componentsStub,
      'grounds-stub': groundsStub,
    }),
    'ContentTypesParityBundle',
    { 'kit.config.json': 'grounds-stub' },
  );

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: {
        contentType: '',
        columns: 3,
        orderby: 'manual',
        ctaText: '',
        sectionDivider: 'none',
        ground: '',
        postsPerPage: 0,
        pagination: 'loadMore',
        moreText: '',
        includeIds: [],
        excludeIds: [],
        entrance: {},
      },
      setAttributes() {},
      clientId: 'parity-1',
    }),
  );

  // The first select rendered is "Content type" (see block.jsx); its first
  // option is the "Choose one…" placeholder, not a registered type.
  const options = globalThis.__wpEditorTest.selects[0].options.slice(1);
  return Object.fromEntries(options.map((o) => [o.value, o.label]));
}

test('post-grid/block.jsx CONTENT_TYPES matches the types the sample content-types.php registers', async () => {
  assert.deepEqual(await jsSide(), phpSide());
});
