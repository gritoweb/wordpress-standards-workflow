import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { buildKitTheme, wizardBlocks as blocks } from './support.mjs';

// A fresh theme: the kit's theme/ plus every file the wizard writes, verbatim from its code blocks.
function buildTheme() {
  const root = buildKitTheme({ grounds: [{ name: 'ink', token: '--color-ink', light: false }] });
  const css = (path, text) => {
    mkdirSync(dirname(join(root, 'resources/css', path)), { recursive: true });
    writeFileSync(join(root, 'resources/css', path), text);
  };
  css('global/variables.css', blocks('## Step 2 — `global/variables.css`', 'css')[0]);
  css('contrast-pairs.json', blocks('## Step 2 — `global/variables.css`', 'json')[0]);
  css('global/typography.css', blocks('## Step 3 — `global/typography.css`', 'css')[0]);
  css('global/layout.css', blocks('## Step 4 — `global/layout.css`', 'css')[0]);
  css('global/base.css', blocks('## Step 5 — `global/base.css`', 'css')[0]);
  css('global/container.css', blocks('## Step 6 — `global/container.css`', 'css')[0]);
  const [button, card] = blocks('## Step 7 — `components/button.css` and `components/card.css`', 'css');
  css('components/button.css', button);
  css('components/card.css', card);
  css('app.css', blocks('### `resources/css/app.css`', 'css')[0]);
  css('editor.css', blocks('### `resources/css/editor.css`', 'css')[0]);
  css('editor/canvas.css', blocks('### `resources/css/editor/canvas.css`', 'css')[0]);
  writeFileSync(join(root, 'theme.json'), `{ "settings": { ${blocks('### `theme.json` — the editor column', 'json')[0]} } }`);
  return root;
}

const run = (root, script) => {
  try {
    return { code: 0, out: execFileSync('node', [script], { cwd: root, encoding: 'utf8', stdio: 'pipe' }) };
  } catch (error) {
    return { code: error.status, out: `${error.stdout}${error.stderr}` };
  }
};

test('a theme built from theme/ plus the wizard passes kit-setup, the foundation check and the contrast gate', () => {
  const root = buildTheme();
  try {
    assert.equal(run(root, 'scripts/kit-setup.mjs').code, 0);
    for (const script of ['scripts/check-css-foundation.mjs', 'scripts/contrast.mjs']) {
      const { code, out } = run(root, script);
      assert.equal(code, 0, `${script}:\n${out}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
