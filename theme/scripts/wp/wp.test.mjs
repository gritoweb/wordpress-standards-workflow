import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = ['lib.sh', 'comments-off.sh', 'menus.sh', 'media-import.sh', 'sample-pages.sh'];

// --- bash -n on every script -------------------------------------------

for (const script of SCRIPTS) {
  test(`${script} has valid bash syntax`, () => {
    execFileSync('bash', ['-n', join(DIR, script)]);
  });
}

// --- the local-only guard (lib.sh) --------------------------------------

function runBash(code, env = {}) {
  return execFileSync('bash', ['-c', code], {
    cwd: DIR,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

test('is_local_siteurl accepts *.lndo.site and localhost', () => {
  const out = runBash(
    `source ./lib.sh
     for u in "http://example.lndo.site" "https://foo.bar.lndo.site:8443" "http://localhost" "http://localhost:8080/"; do
       is_local_siteurl "$u" && echo "LOCAL $u" || echo "REMOTE $u"
     done`,
  );
  assert.equal(
    out,
    'LOCAL http://example.lndo.site\n' +
      'LOCAL https://foo.bar.lndo.site:8443\n' +
      'LOCAL http://localhost\n' +
      'LOCAL http://localhost:8080/\n',
  );
});

test('is_local_siteurl rejects everything else', () => {
  const out = runBash(
    `source ./lib.sh
     for u in "https://example.com" "http://lndo.site.evil.com" "http://127.0.0.1" "https://staging.example.com"; do
       is_local_siteurl "$u" && echo "LOCAL $u" || echo "REMOTE $u"
     done`,
  );
  assert.equal(
    out,
    'REMOTE https://example.com\n' +
      'REMOTE http://lndo.site.evil.com\n' +
      'REMOTE http://127.0.0.1\n' +
      'REMOTE https://staging.example.com\n',
  );
});

function fakeWp(t, siteurl) {
  const dir = mkdtempSync(join(tmpdir(), 'fake-wp-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'fake-wp.sh');
  writeFileSync(
    path,
    `#!/usr/bin/env bash\nif [[ "$1 $2 $3" == "option get siteurl" ]]; then echo "${siteurl}"; fi\n`,
  );
  chmodSync(path, 0o755);
  return path;
}

test('require_local_wp passes on a local siteurl', (t) => {
  const wp = fakeWp(t, 'http://acme.lndo.site');
  const out = runBash(`source ./lib.sh; require_local_wp; echo ok`, { WP_CLI: wp });
  assert.equal(out, 'ok\n');
});

test('require_local_wp exits nonzero on a non-local siteurl', (t) => {
  const wp = fakeWp(t, 'https://acme.com');
  assert.throws(() => runBash(`source ./lib.sh; require_local_wp; echo ok`, { WP_CLI: wp }));
});

test('require_local_wp exits nonzero when wp-cli itself fails', () => {
  assert.throws(() => runBash(`source ./lib.sh; require_local_wp; echo ok`, { WP_CLI: '/bin/false' }));
});

// A fake wp-cli that only answers the exact invocations listed in `cases`
// (a bash `case "$*" in ...)` body) and otherwise fails the way real
// wp-cli fails on an unknown flag — a nonzero exit and a message on
// stderr — so a script that still passes a flag a real subcommand
// doesn't accept gets caught instead of silently reading nothing.
function fakeWpCli(t, siteurl, cases) {
  const dir = mkdtempSync(join(tmpdir(), 'fake-wp-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'fake-wp.sh');
  writeFileSync(
    path,
    `#!/usr/bin/env bash
if [[ "$1 $2 $3" == "option get siteurl" ]]; then echo "${siteurl}"; exit 0; fi
case "$*" in
${cases}
  *)
    echo "Error: parameter ambiguous or unavailable." >&2
    exit 1 ;;
esac
`,
  );
  chmodSync(path, 0o755);
  return path;
}

// --- menus.sh -------------------------------------------------------------

// H3: real wp-cli's `menu location list` synopsis has only [--format], and
// `menu list`'s has only [--fields]/[--format] — no --field or --locations.
// This fixture rejects both of the flags the old script used, the way real
// wp-cli's validate_args does, so the test actually catches the regression
// instead of accepting whatever flags a script happens to pass.
//
// `locations` below is a real JSON array, matching actual wp-cli output
// (never a comma-joined string) — see menus.sh's `in_array` check.
function menusFakeWp(t) {
  return fakeWpCli(
    t,
    'http://acme.lndo.site',
    `  "menu location list --format=csv")
    printf 'location\\nfooter_column_1\\nfooter_column_2\\n'
    exit 0 ;;
  "menu list --fields=term_id,name,locations --format=json")
    printf '[{"term_id":"5","name":"Existing Footer","locations":["footer_column_1"]}]'
    exit 0 ;;
  "menu create Footer Column 2 --porcelain")
    echo 42
    exit 0 ;;
  "menu location assign 42 footer_column_2")
    exit 0 ;;
`,
  );
}

test('menus.sh assigns a menu using flags the real wp-cli subcommands accept, and skips an already-assigned location', (t) => {
  const wp = menusFakeWp(t);
  const out = runBash(`bash ./menus.sh`, { WP_CLI: wp });

  assert.match(out, /skip: footer_column_1 already has "Existing Footer"/);
  assert.match(out, /assigned: "Footer Column 2" -> footer_column_2/);
  assert.match(out, /menus: 1 location\(s\) assigned\./);
});

// --- comments-off.sh --------------------------------------------------------

// M7: `post list --post_type=any` defaults to post_status=publish, and
// `any` excludes attachments (status inherit) — drafts, private, scheduled
// and media pages all keep comment_status=open.
function commentsOffFakeWp(t) {
  return fakeWpCli(
    t,
    'http://acme.lndo.site',
    `  "option update default_comment_status closed")
    exit 0 ;;
  "option update default_ping_status closed")
    exit 0 ;;
  "post list --post_type=any --post_status=any --format=ids")
    printf '1 2 3'
    exit 0 ;;
  "post list --post_type=attachment --post_status=inherit --format=ids")
    printf '9'
    exit 0 ;;
  "post update 1 2 3 9 --comment_status=closed --ping_status=closed")
    exit 0 ;;
`,
  );
}

test('comments-off.sh closes comments on drafts/private/scheduled posts and attachments, not only published posts', (t) => {
  const wp = commentsOffFakeWp(t);
  const out = runBash(`bash ./comments-off.sh`, { WP_CLI: wp });

  assert.match(out, /comments-off: default statuses closed; existing posts closed\./);
});

// --- media-import.sh -------------------------------------------------------

// M6: `wp media import` runs in the Lando container, and a folder outside
// the project root (cwd, since these scripts are run "from the project
// root") doesn't exist there even though it does on the host.
test('media-import.sh rejects a folder outside the project root', (t) => {
  const wp = fakeWpCli(t, 'http://acme.lndo.site', '');
  const outside = mkdtempSync(join(tmpdir(), 'outside-project-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));

  assert.throws(() => runBash(`bash ./media-import.sh "${outside}"`, { WP_CLI: wp }));
});

// M6: both docs call every script "idempotent" / "safe to re-run"; a second
// run of media-import.sh must not import the same file twice.
test('media-import.sh skips a file whose basename is already an attachment', (t) => {
  const projectRoot = mkdtempSync(join(tmpdir(), 'project-root-'));
  t.after(() => rmSync(projectRoot, { recursive: true, force: true }));
  const media = join(projectRoot, 'media');
  mkdirSync(media);
  writeFileSync(join(media, 'photo.jpg'), 'fake image bytes');
  writeFileSync(join(media, 'new.jpg'), 'fake image bytes');

  const wp = fakeWpCli(
    t,
    'http://acme.lndo.site',
    `  "post list --post_type=attachment --post_status=inherit --name=photo --field=ID --posts_per_page=1")
    echo 5
    exit 0 ;;
  "post list --post_type=attachment --post_status=inherit --name=new --field=ID --posts_per_page=1")
    exit 0 ;;
  "media import media/new.jpg")
    exit 0 ;;
`,
  );

  const out = execFileSync('bash', [join(DIR, 'media-import.sh'), 'media'], {
    cwd: projectRoot,
    env: { ...process.env, WP_CLI: wp },
    encoding: 'utf8',
  });

  assert.match(out, /imported 1 file\(s\)/);
  assert.match(out, /1 already present/);
});

// --- sample-pages.sh: the host php call must not fail silently -----------

function samplePagesFakeWp(t) {
  return fakeWpCli(
    t,
    'http://acme.lndo.site',
    `  "post list --post_type=page --name=style-guide --field=ID --posts_per_page=1")
    exit 0 ;;
  "post create --post_type=page --post_status=publish --post_title=Style Guide --post_name=style-guide --post_content= --porcelain")
    echo 77
    exit 0 ;;
  "post meta update 77 _wp_page_template template-styleguide.blade.php")
    exit 0 ;;
`,
  );
}

// M4: the php call ran inside \`< <(...)\`, so \`set -e\` never saw a failure
// there — the loop just read nothing and the script still reported success
// after creating only the style guide page. /usr/bin and /bin have every
// tool these scripts need except php (it's a Homebrew-only install here),
// so this PATH reproduces "php missing" without a fake binary.
test('sample-pages.sh fails instead of silently creating only the style guide page when php is missing', (t) => {
  const wp = samplePagesFakeWp(t);
  assert.throws(() =>
    runBash(`bash ./sample-pages.sh --blocks-dir ./test-fixtures/blocks`, { WP_CLI: wp, PATH: '/usr/bin:/bin' }),
  );
});

test('sample-pages.sh fails instead of silently creating only the style guide page when the php helper itself fails', (t) => {
  const wp = samplePagesFakeWp(t);
  const binDir = mkdtempSync(join(tmpdir(), 'fake-php-'));
  t.after(() => rmSync(binDir, { recursive: true, force: true }));
  writeFileSync(join(binDir, 'php'), '#!/usr/bin/env bash\nexit 1\n');
  chmodSync(join(binDir, 'php'), 0o755);

  assert.throws(() =>
    runBash(`bash ./sample-pages.sh --blocks-dir ./test-fixtures/blocks`, {
      WP_CLI: wp,
      PATH: `${binDir}:/usr/bin:/bin`,
    }),
  );
});

// H4: the EXIT trap referenced a local `records_file` after main() had
// already returned and its scope was gone, so `set -u` treated it as
// unbound and the script always exited 1 even after creating every page,
// even though it had just succeeded.
test('sample-pages.sh exits zero after successfully creating the style guide page', (t) => {
  const wp = samplePagesFakeWp(t);
  const emptyBlocksDir = mkdtempSync(join(tmpdir(), 'empty-blocks-'));
  t.after(() => rmSync(emptyBlocksDir, { recursive: true, force: true }));

  const out = runBash(`bash ./sample-pages.sh --blocks-dir "${emptyBlocksDir}"`, { WP_CLI: wp });

  assert.match(out, /created: Style Guide/);
  assert.match(out, /sample-pages: 0 block-group page\(s\) \+ the style guide page\./);
});

// --- sample-pages-blocks.php: block.json -> grouped example markup ------

const FIXTURES = join(DIR, 'test-fixtures', 'blocks');

function runHelper(dir) {
  const out = execFileSync('php', [join(DIR, 'sample-pages-blocks.php'), dir]);
  return out
    .toString('binary')
    .split('\0')
    .filter(Boolean)
    .map((record) => {
      const [slug, title, markupB64] = record.split('\x1f');
      return { slug, title, markup: Buffer.from(markupB64, 'base64').toString('utf8') };
    });
}

test('groups fixture blocks by category, using each block.json name + example.attributes', () => {
  const groups = runHelper(FIXTURES);

  assert.equal(groups.length, 2);

  const blocks = groups.find((g) => g.slug === 'kit-sample-acme-blocks');
  assert.equal(blocks.title, 'Kit sample: Acme Blocks');
  assert.match(blocks.markup, /<!-- wp:acme\/hero \{"heading":"Sample heading","ground":"light"\} \/-->/);
  assert.match(blocks.markup, /<!-- wp:acme\/no-example \{\} \/-->/);

  const testimonials = groups.find((g) => g.slug === 'kit-sample-acme-testimonials');
  assert.equal(testimonials.title, 'Kit sample: Acme Testimonials');
  assert.match(testimonials.markup, /<!-- wp:acme\/testimonial-a \{"quote":"A quote"\} \/-->/);
  assert.match(testimonials.markup, /<!-- wp:acme\/testimonial-b \{"quote":"Another"\} \/-->/);
});

test('skips a block.json with no name', () => {
  const groups = runHelper(FIXTURES);
  const markup = groups.map((g) => g.markup).join('\n');
  assert.doesNotMatch(markup, /no-name/);
});

// M5: create-block's block.json template sets example.attributes.isPreview
// to turn on the inserter's static preview. sample-pages-blocks.php
// serializes that same example into real page content, so without
// stripping it, every sample block renders as its preview.svg image
// instead of an editable block.
test('drops isPreview from the serialized example markup', () => {
  const groups = runHelper(FIXTURES);
  const blocks = groups.find((g) => g.slug === 'kit-sample-acme-blocks');

  assert.match(blocks.markup, /<!-- wp:acme\/preview-flag \{"heading":"Has a preview flag"\} \/-->/);
  assert.doesNotMatch(blocks.markup, /isPreview/);
});

test('an empty blocks dir produces no groups', () => {
  const dir = mkdtempSync(join(tmpdir(), 'empty-blocks-'));
  try {
    assert.deepEqual(runHelper(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
