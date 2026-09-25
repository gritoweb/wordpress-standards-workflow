import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  checkPairs,
  gatePairs,
  contrastRatio,
  opaque,
  parseColor,
  relativeLuminance,
  resolveTokens,
} from './contrast.mjs';

test('parseColor reads 3, 6 and 8 digit hex', () => {
  assert.deepEqual(parseColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseColor('#767676'), { r: 118, g: 118, b: 118, a: 1 });
  assert.deepEqual(parseColor('#00000080'), { r: 0, g: 0, b: 0, a: 128 / 255 });
});

test('parseColor reads rgb()/rgba() in comma and space/slash syntax', () => {
  assert.deepEqual(parseColor('rgba(0, 0, 0, 0.5)'), { r: 0, g: 0, b: 0, a: 0.5 });
  assert.deepEqual(parseColor('rgb(255 255 255 / 0.3)'), {
    r: 255,
    g: 255,
    b: 255,
    a: 0.3,
  });
  assert.deepEqual(parseColor('rgb(51, 52, 42)'), { r: 51, g: 52, b: 42, a: 1 });
});

test('parseColor blends color-mix(in srgb, A p%, B)', () => {
  const mixed = parseColor('color-mix(in srgb, #000000 60%, transparent)');

  assert.deepEqual(mixed, { r: 0, g: 0, b: 0, a: 0.6 });
});

test('relativeLuminance and contrastRatio match the known #767676 on white ratio', () => {
  const grey = [118, 118, 118];
  const white = [255, 255, 255];

  assert.ok(Math.abs(relativeLuminance(white) - 1) < 1e-9);
  assert.ok(Math.abs(contrastRatio(grey, white) - 4.54) < 0.01);
});

test('opaque composites a translucent color over its ground', () => {
  const dark = { r: 0, g: 0, b: 0, a: 0.6 };

  assert.deepEqual(opaque(dark), [102, 102, 102]);
  assert.deepEqual(opaque(dark, [30, 30, 30]), [12, 12, 12]);
  assert.deepEqual(opaque({ r: 10, g: 20, b: 30, a: 1 }), [10, 20, 30]);
});

test('resolveTokens follows a var() chain to its final value', () => {
  const tokens = resolveTokens(`
    :root {
      --color-yellow-500: #e8cb52;
      --color-primary: var(--color-yellow-500);
      --color-primary-hover: color-mix(in oklch, var(--color-primary), black 10%);
    }
  `);

  assert.equal(tokens['--color-primary'], '#e8cb52');
  assert.match(tokens['--color-primary-hover'], /#e8cb52/);
});

test('resolveTokens uses the fallback when a referenced token is missing', () => {
  const tokens = resolveTokens(`:root { --x: var(--missing, #123456); }`);

  assert.equal(tokens['--x'], '#123456');
});

test('checkPairs passes text at 4.5:1 and fails it at 3:1, using resolved tokens', () => {
  const tokens = { '--fg': '#767676', '--bg': '#ffffff', '--low': '#aaaaaa' };

  assert.deepEqual(
    checkPairs(tokens, [{ fg: '--fg', bg: '--bg', kind: 'text' }]),
    [],
  );

  const failures = checkPairs(tokens, [
    { fg: '--low', bg: '--bg', kind: 'text' },
  ]);

  assert.equal(failures.length, 1);
  assert.equal(failures[0].required, 4.5);
  assert.ok(failures[0].ratio < 4.5);
});

test('checkPairs uses the 3:1 threshold for large text and UI, and a literal color when the name is not a token', () => {
  const tokens = { '--ink': '#333333' };

  assert.deepEqual(
    checkPairs(tokens, [{ fg: '--ink', bg: '#e0e0e0', kind: 'ui' }]),
    [],
  );
});

test('checkPairs composites a translucent fg onto its resolved bg, not the ground', () => {
  const failures = checkPairs({}, [
    { fg: 'rgba(255,255,255,0.2)', bg: '#000', kind: 'text' },
  ]);

  assert.equal(failures.length, 1);
  assert.ok(failures[0].ratio < 2, `expected a ratio under 2, got ${failures[0].ratio}`);
});

test('parseColor reads a percent alpha in rgb()/rgba() as a fraction', () => {
  assert.deepEqual(parseColor('rgb(0 0 0 / 50%)'), { r: 0, g: 0, b: 0, a: 0.5 });
});

test('parseColor accepts color-mix with the percentage on either color, or on neither', () => {
  assert.deepEqual(parseColor('color-mix(in srgb, #000000, #ffffff)'), {
    r: 127.5,
    g: 127.5,
    b: 127.5,
    a: 1,
  });
  const mixed = parseColor('color-mix(in srgb, #000000, #ffffff 30%)');
  assert.ok(Math.abs(mixed.r - 76.5) < 1e-9);
  assert.ok(Math.abs(mixed.g - 76.5) < 1e-9);
  assert.ok(Math.abs(mixed.b - 76.5) < 1e-9);
  assert.equal(mixed.a, 1);
});

test('parseColor premultiplies alpha before mixing with transparent', () => {
  const mixed = parseColor('color-mix(in srgb, #fff 50%, transparent)');

  assert.equal(mixed.a, 0.5);
  assert.equal(mixed.r, 255);
  assert.equal(mixed.g, 255);
  assert.equal(mixed.b, 255);
});

test('parseColor throws a clear error for a color-mix space other than srgb', () => {
  assert.throws(
    () => parseColor('color-mix(in oklch, #fff 50%, #000)'),
    /only srgb color-mix is supported/,
  );
});

test('resolveTokens only reads top-level :root/html declarations, not ones inside an @media', () => {
  const tokens = resolveTokens(`
    :root { --bg: #fff; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #000; }
    }
  `);

  assert.equal(tokens['--bg'], '#fff');
});

test('resolveTokens parses a nested var() fallback with balanced parens', () => {
  const tokens = resolveTokens(`:root { --x: var(--a, var(--b, #123456)); }`);

  assert.equal(tokens['--x'], '#123456');
});

test('checkPairs composites an alpha token over the given ground before measuring', () => {
  const tokens = {
    '--scrim': 'color-mix(in srgb, #f9f8f4 85%, transparent)',
    '--ink-text': '#33342a',
  };
  const darkPhoto = 'rgb(30, 30, 30)';

  const failures = checkPairs(
    tokens,
    [{ fg: '--ink-text', bg: '--scrim', kind: 'text' }],
    { ground: darkPhoto },
  );

  assert.deepEqual(failures, []);
});

test('resolveTokens reads Tailwind @theme blocks as root tokens', () => {
  const tokens = resolveTokens(
    '@theme { --color-grey-900: #111; } @theme static { --color-grey-50: #fafafa; } :root { --color-ink: var(--color-grey-900); }',
  );
  assert.equal(tokens['--color-ink'], '#111');
  assert.equal(tokens['--color-grey-50'], '#fafafa');
});

test('gatePairs reports an asDrawn failure without erroring, and still errors on an unflagged failure', () => {
  const tokens = { '--fg': '#777', '--bg': '#fff' };
  const pairs = [
    { fg: '--fg', bg: '--bg', kind: 'text', label: 'drawn', asDrawn: true },
    { fg: '--fg', bg: '--bg', kind: 'text', label: 'unflagged' },
  ];
  const { errors, asDrawn, stale } = gatePairs(tokens, pairs);

  assert.deepEqual(asDrawn.map((pair) => pair.label), ['drawn']);
  assert.equal(asDrawn[0].ratio, 4.48);
  assert.equal(asDrawn[0].required, 4.5);
  assert.deepEqual(errors.map((pair) => pair.label), ['unflagged']);
  assert.deepEqual(stale, []);
});

test('gatePairs marks an asDrawn pair that now passes as stale', () => {
  const tokens = { '--fg': '#111', '--bg': '#fff' };
  const { errors, asDrawn, stale } = gatePairs(tokens, [
    { fg: '--fg', bg: '--bg', kind: 'text', label: 'fixed', asDrawn: true },
  ]);

  assert.deepEqual(errors, []);
  assert.deepEqual(asDrawn, []);
  assert.deepEqual(stale.map((pair) => pair.label), ['fixed']);
});

test('gatePairs passes an unflagged pair that clears its threshold', () => {
  const tokens = { '--fg': '#111', '--bg': '#fff' };

  assert.deepEqual(gatePairs(tokens, [{ fg: '--fg', bg: '--bg', kind: 'text' }]), {
    errors: [],
    asDrawn: [],
    stale: [],
  });
});
