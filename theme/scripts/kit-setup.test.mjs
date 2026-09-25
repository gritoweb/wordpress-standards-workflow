import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { validateConfig, applyReplacements, findPlaceholders, renamePlaceholders, generateGrounds, groundsCss } from './kit-setup.mjs';

const SCRIPT = fileURLToPath(new URL('./kit-setup.mjs', import.meta.url));

const GOOD_CONFIG = {
  prefix: 'acme',
  textDomain: 'acme-2026',
  themeSlug: 'acme-2026',
  blockNamespace: 'acme-2026',
  blockCategory: { slug: 'acme-2026', title: 'Acme Blocks' },
  grounds: [],
};

function makeTheme({ config = GOOD_CONFIG, styleTextDomain = 'acme-2026' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'kit-setup-'));
  writeFileSync(join(root, 'style.css'), `/*\nTheme Name: Test\nText Domain: ${styleTextDomain}\n*/\n`);
  writeFileSync(join(root, 'kit.config.json'), JSON.stringify(config));

  mkdirSync(join(root, 'app'), { recursive: true });
  writeFileSync(
    join(root, 'app', 'BlockManager.php'),
    "namespace = '__BLOCK_NAMESPACE__'; // __TEXT_DOMAIN__ __THEME_SLUG__ __PREFIX__ __BLOCK_CATEGORY_SLUG__ __BLOCK_CATEGORY_TITLE__\n",
  );

  mkdirSync(join(root, 'node_modules', 'some-pkg'), { recursive: true });
  writeFileSync(join(root, 'node_modules', 'some-pkg', 'index.js'), '__PREFIX__\n');
  mkdirSync(join(root, 'vendor', 'some-lib'), { recursive: true });
  writeFileSync(join(root, 'vendor', 'some-lib', 'lib.php'), '__PREFIX__\n');
  mkdirSync(join(root, 'public'), { recursive: true });
  writeFileSync(join(root, 'public', 'build.js'), '__PREFIX__\n');

  return root;
}

test('validateConfig rejects "sage" values', () => {
  const root = makeTheme({ config: { ...GOOD_CONFIG, prefix: 'sage' } });
  assert.throws(() => validateConfig({ ...GOOD_CONFIG, prefix: 'sage' }, root), /may not be "sage"/);
  rmSync(root, { recursive: true, force: true });
});

test('validateConfig accepts a kitPath and rejects one that is not a path string', () => {
  const root = makeTheme();
  assert.doesNotThrow(() => validateConfig({ ...GOOD_CONFIG, kitPath: '/Users/dev/sage-site-kit' }, root));
  for (const kitPath of ['', '  ', 7, ['/kit']]) {
    assert.throws(() => validateConfig({ ...GOOD_CONFIG, kitPath }, root), /kitPath must be/);
  }
  rmSync(root, { recursive: true, force: true });
});

test('validateConfig rejects a non-slug value', () => {
  const root = makeTheme();
  assert.throws(
    () => validateConfig({ ...GOOD_CONFIG, blockNamespace: 'Not Valid!' }, root),
    /lowercase slug/,
  );
  rmSync(root, { recursive: true, force: true });
});

test('validateConfig rejects "sage" for textDomain, even when style.css still says sage', () => {
  const root = makeTheme({ styleTextDomain: 'sage', config: { ...GOOD_CONFIG, textDomain: 'sage' } });
  assert.throws(
    () => validateConfig({ ...GOOD_CONFIG, textDomain: 'sage' }, root),
    /textDomain may not be "sage"/,
  );
  rmSync(root, { recursive: true, force: true });
});

test('validateConfig rejects a blockCategory.title with a quote, backslash, or newline', () => {
  const root = makeTheme();
  for (const title of [`Acme's Blocks`, `Acme "Blocks"`, 'Acme\\Blocks', 'Acme\nBlocks', '']) {
    assert.throws(
      () =>
        validateConfig(
          { ...GOOD_CONFIG, blockCategory: { slug: 'acme-2026', title } },
          root,
        ),
      /blockCategory\.title/,
      title,
    );
  }
  rmSync(root, { recursive: true, force: true });
});

test('validateConfig rejects a textDomain mismatch with style.css', () => {
  const root = makeTheme({ styleTextDomain: 'other-domain' });
  assert.throws(() => validateConfig(GOOD_CONFIG, root), /doesn't match style\.css/);
  rmSync(root, { recursive: true, force: true });
});

test('validateConfig passes a well-formed config', () => {
  const root = makeTheme();
  assert.doesNotThrow(() => validateConfig(GOOD_CONFIG, root));
  rmSync(root, { recursive: true, force: true });
});

test('applyReplacements fills placeholders and skips node_modules/vendor/public', () => {
  const root = makeTheme();
  const changed = applyReplacements(root, GOOD_CONFIG);
  assert.equal(changed, 1);

  const blockManager = readFileSync(join(root, 'app', 'BlockManager.php'), 'utf8');
  assert.equal(
    blockManager,
    "namespace = 'acme-2026'; // acme-2026 acme-2026 acme acme-2026 Acme Blocks\n",
  );

  assert.equal(readFileSync(join(root, 'node_modules', 'some-pkg', 'index.js'), 'utf8'), '__PREFIX__\n');
  assert.equal(readFileSync(join(root, 'vendor', 'some-lib', 'lib.php'), 'utf8'), '__PREFIX__\n');
  assert.equal(readFileSync(join(root, 'public', 'build.js'), 'utf8'), '__PREFIX__\n');

  rmSync(root, { recursive: true, force: true });
});

test('applyReplacements is idempotent', () => {
  const root = makeTheme();
  applyReplacements(root, GOOD_CONFIG);
  const secondPass = applyReplacements(root, GOOD_CONFIG);
  assert.equal(secondPass, 0);
  assert.deepEqual(findPlaceholders(root), []);
  rmSync(root, { recursive: true, force: true });
});

test('--check reports leftover placeholders and exits 1', () => {
  const root = makeTheme();
  assert.throws(() => execFileSync('node', [SCRIPT, '--check'], { cwd: root, stdio: 'pipe' }));
  rmSync(root, { recursive: true, force: true });
});

test('--check exits 0 once placeholders are filled and grounds.css is generated', () => {
  const root = makeTheme();
  applyReplacements(root, GOOD_CONFIG);
  generateGrounds(root, GOOD_CONFIG);
  const output = execFileSync('node', [SCRIPT, '--check'], { cwd: root, stdio: 'pipe' }).toString();
  assert.match(output, /no leftover placeholders/);
  rmSync(root, { recursive: true, force: true });
});

test('applyReplacements skips .claude/skills and .agents/skills, for when the theme is also the project root', () => {
  const root = makeTheme();
  mkdirSync(join(root, '.claude', 'skills', 'example'), { recursive: true });
  writeFileSync(
    join(root, '.claude', 'skills', 'example', 'SKILL.md'),
    'Use __PREFIX__ as an example placeholder.\n',
  );
  mkdirSync(join(root, '.agents', 'skills', 'example'), { recursive: true });
  writeFileSync(
    join(root, '.agents', 'skills', 'example', 'SKILL.md'),
    'Use __PREFIX__ as an example placeholder.\n',
  );

  applyReplacements(root, GOOD_CONFIG);

  assert.equal(
    readFileSync(join(root, '.claude', 'skills', 'example', 'SKILL.md'), 'utf8'),
    'Use __PREFIX__ as an example placeholder.\n',
  );
  assert.equal(
    readFileSync(join(root, '.agents', 'skills', 'example', 'SKILL.md'), 'utf8'),
    'Use __PREFIX__ as an example placeholder.\n',
  );

  rmSync(root, { recursive: true, force: true });
});

test('--check fails when grounds.css is missing or stale', () => {
  const root = makeTheme();
  applyReplacements(root, GOOD_CONFIG);
  assert.throws(() => execFileSync('node', [SCRIPT, '--check'], { cwd: root, stdio: 'pipe' }));

  generateGrounds(root, { ...GOOD_CONFIG, grounds: [{ name: 'stale', token: '--x', light: true }] });
  assert.throws(() => execFileSync('node', [SCRIPT, '--check'], { cwd: root, stdio: 'pipe' }));
  rmSync(root, { recursive: true, force: true });
});

test('main (no --check) writes grounds.css alongside filling placeholders', () => {
  const root = makeTheme();
  execFileSync('node', [SCRIPT], { cwd: root, stdio: 'pipe' });
  const css = readFileSync(join(root, 'resources', 'css', 'global', 'grounds.css'), 'utf8');
  assert.equal(css, groundsCss(GOOD_CONFIG.grounds));
  rmSync(root, { recursive: true, force: true });
});

test('groundsCss rejects a ground name that is not a lowercase slug', () => {
  assert.throws(() => groundsCss([{ name: 'Not Valid', token: '--x', light: true }]), /lowercase slug/);
});

// L3: token is interpolated straight into var(...) — a missing or misspelled
// one (no leading --) would otherwise print var(undefined) or dead CSS
// with no failure from --check.
test('groundsCss rejects a token that is not a custom property name', () => {
  assert.throws(
    () => groundsCss([{ name: 'primary', token: 'color-ink', light: true }]),
    /grounds\[0\].*token.*--/,
  );
  assert.throws(() => groundsCss([{ name: 'primary', light: true }]), /grounds\[0\].*token/);
});

test('groundsCss rejects a non-boolean "light"', () => {
  assert.throws(
    () => groundsCss([{ name: 'primary', token: '--color-primary', light: 'yes' }]),
    /grounds\[0\].*light.*boolean/,
  );
});

test('groundsCss is idempotent: regenerating from the same config changes nothing', () => {
  const first = groundsCss(GOOD_CONFIG.grounds);
  const second = groundsCss(GOOD_CONFIG.grounds);
  assert.equal(first, second);
});

test('applyReplacements does not rewrite its own script, its own test, or kit.config.json', () => {
  const root = makeTheme();
  const scriptSrc = readFileSync(SCRIPT, 'utf8');
  const testSrc = readFileSync(fileURLToPath(new URL('./kit-setup.test.mjs', import.meta.url)), 'utf8');
  const configBefore = readFileSync(join(root, 'kit.config.json'), 'utf8') + '\n// __PREFIX__ __TEXT_DOMAIN__\n';

  mkdirSync(join(root, 'scripts'), { recursive: true });
  writeFileSync(join(root, 'scripts', 'kit-setup.mjs'), scriptSrc);
  writeFileSync(join(root, 'scripts', 'kit-setup.test.mjs'), testSrc);
  writeFileSync(join(root, 'kit.config.json'), configBefore);

  applyReplacements(root, GOOD_CONFIG);

  assert.equal(readFileSync(join(root, 'scripts', 'kit-setup.mjs'), 'utf8'), scriptSrc);
  assert.equal(readFileSync(join(root, 'scripts', 'kit-setup.test.mjs'), 'utf8'), testSrc);
  assert.equal(readFileSync(join(root, 'kit.config.json'), 'utf8'), configBefore);

  rmSync(root, { recursive: true, force: true });
});

test('validateConfig requires prefix to be an identifier (no hyphens)', () => {
  const root = makeTheme();
  assert.throws(
    () => validateConfig({ ...GOOD_CONFIG, prefix: 'acme-2026' }, root),
    /prefix must be/,
  );
  assert.doesNotThrow(() => validateConfig({ ...GOOD_CONFIG, prefix: 'acme_co' }, root));
  rmSync(root, { recursive: true, force: true });
});

test('validateConfig still allows hyphens in themeSlug, blockNamespace, and category slug', () => {
  const root = makeTheme();
  assert.doesNotThrow(() =>
    validateConfig(
      { ...GOOD_CONFIG, themeSlug: 'acme-2026', blockNamespace: 'acme-2026', blockCategory: { slug: 'acme-2026', title: 'Acme' } },
      root,
    ),
  );
  rmSync(root, { recursive: true, force: true });
});

test('validateConfig rejects a textDomain that is not a valid slug, even if it matches style.css', () => {
  const root = makeTheme({ styleTextDomain: 'Acme_2026', config: { ...GOOD_CONFIG, textDomain: 'Acme_2026' } });
  assert.throws(
    () => validateConfig({ ...GOOD_CONFIG, textDomain: 'Acme_2026' }, root),
    /textDomain must be a lowercase slug/,
  );
  rmSync(root, { recursive: true, force: true });
});

// A file's NAME can carry a placeholder too (acf-json/group___PREFIX___site_settings.json).
// applyReplacements only ever touched contents, so --check reported clean while the
// literal token still shipped in the filename.
test('renamePlaceholders renames a file whose name carries a placeholder token', () => {
  const root = makeTheme();
  mkdirSync(join(root, 'acf-json'), { recursive: true });
  writeFileSync(join(root, 'acf-json', 'group___PREFIX___site_settings.json'), '{}\n');

  const changed = renamePlaceholders(root, GOOD_CONFIG);

  assert.equal(changed, 1);
  assert.ok(existsSync(join(root, 'acf-json', 'group_acme_site_settings.json')));
  assert.ok(!existsSync(join(root, 'acf-json', 'group___PREFIX___site_settings.json')));
  rmSync(root, { recursive: true, force: true });
});

test('renamePlaceholders renames a directory whose name carries a placeholder token', () => {
  const root = makeTheme();
  mkdirSync(join(root, 'resources', '__THEME_SLUG__'), { recursive: true });
  writeFileSync(join(root, 'resources', '__THEME_SLUG__', 'file.txt'), 'hi\n');

  renamePlaceholders(root, GOOD_CONFIG);

  assert.ok(existsSync(join(root, 'resources', 'acme-2026', 'file.txt')));
  assert.ok(!existsSync(join(root, 'resources', '__THEME_SLUG__')));
  rmSync(root, { recursive: true, force: true });
});

test('renamePlaceholders skips node_modules/vendor/public, like applyReplacements', () => {
  const root = makeTheme();
  assert.ok(existsSync(join(root, 'node_modules', 'some-pkg')));

  renamePlaceholders(root, GOOD_CONFIG);

  const nodeModules = readdirSync(join(root, 'node_modules'));
  assert.deepEqual(nodeModules, ['some-pkg']);
  rmSync(root, { recursive: true, force: true });
});

test('findPlaceholders also reports a leftover placeholder in a file or directory name', () => {
  const root = makeTheme();
  applyReplacements(root, GOOD_CONFIG);
  mkdirSync(join(root, 'acf-json'), { recursive: true });
  writeFileSync(join(root, 'acf-json', 'group___PREFIX___site_settings.json'), '{}\n');

  const hits = findPlaceholders(root);

  assert.ok(hits.some((hit) => hit.token === '__PREFIX__' && hit.file.endsWith('group___PREFIX___site_settings.json')));
  rmSync(root, { recursive: true, force: true });
});

test('--check exits 1 for a leftover placeholder filename, even once content is clean', () => {
  const root = makeTheme();
  applyReplacements(root, GOOD_CONFIG);
  mkdirSync(join(root, 'acf-json'), { recursive: true });
  writeFileSync(join(root, 'acf-json', 'group___PREFIX___site_settings.json'), '{}\n');

  assert.throws(() => execFileSync('node', [SCRIPT, '--check'], { cwd: root, stdio: 'pipe' }));
  rmSync(root, { recursive: true, force: true });
});

test('a symlinked folder is neither read as a file nor followed, so setup does not crash on it', () => {
  const root = makeTheme();
  mkdirSync(join(root, 'shared'), { recursive: true });
  writeFileSync(join(root, 'shared', 'file.php'), '__PREFIX__\n');
  symlinkSync(join(root, 'shared'), join(root, 'linked'));

  assert.doesNotThrow(() => applyReplacements(root, GOOD_CONFIG));
  assert.doesNotThrow(() => renamePlaceholders(root, GOOD_CONFIG));

  // The real folder is rewritten once, at its own path.
  assert.equal(readFileSync(join(root, 'shared', 'file.php'), 'utf8'), 'acme\n');
  rmSync(root, { recursive: true, force: true });
});
