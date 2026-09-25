import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const kit = join(dirname(fileURLToPath(import.meta.url)), '..');
const wizard = readFileSync(join(kit, 'skills/css-foundation-wizard/SKILL.md'), 'utf8');

// Every fenced block of `lang` under the heading, in order.
function blocks(heading, lang) {
  const from = wizard.indexOf(heading);
  assert.ok(from >= 0, `wizard lacks "${heading}"`);
  const next = wizard.indexOf('\n#', from + heading.length);
  const section = wizard.slice(from, next === -1 ? undefined : next);
  return [...section.matchAll(new RegExp('```' + lang + '\\n([\\s\\S]*?)```', 'g'))].map((m) => m[1]);
}

// A fresh theme: the kit's theme/ plus every file the wizard writes, verbatim from its code blocks.
function buildTheme() {
  const root = mkdtempSync(join(tmpdir(), 'foundation-install-'));
  cpSync(join(kit, 'theme'), root, { recursive: true });
  // A Sage theme has postcss through Vite; the kit's node_modules stands in for it.
  symlinkSync(join(kit, 'node_modules'), join(root, 'node_modules'));
  writeFileSync(join(root, 'style.css'), '/*\nTheme Name: Acme\nText Domain: acme-2026\n*/\n');
  writeFileSync(join(root, 'vite.config.js'), 'export default {};\n');
  writeFileSync(
    join(root, 'kit.config.json'),
    JSON.stringify({ prefix: 'acme', textDomain: 'acme-2026', themeSlug: 'acme-2026', blockNamespace: 'acme-2026', blockCategory: { slug: 'acme-2026', title: 'Acme Blocks' }, grounds: [{ name: 'ink', token: '--color-ink', light: false }] }),
  );
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
