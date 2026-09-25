import postcss from 'postcss';

// WCAG AA contrast for design tokens. Parses a color to sRGB (hex, rgb()/
// rgba(), and one level of color-mix(in <space>, A p%, B)), computes relative
// luminance and the contrast ratio, and checks a list of token pairs against
// the WCAG AA thresholds: 4.5:1 for body text, 3:1 for large text and
// non-text UI.

const NAMED = {
  transparent: { r: 0, g: 0, b: 0, a: 0 },
  white: { r: 255, g: 255, b: 255, a: 1 },
  black: { r: 0, g: 0, b: 0, a: 1 },
};

const hexPair = (hex, i) => parseInt(hex.slice(i, i + 2), 16);

// Parses a CSS color to { r, g, b, a } (0-255, alpha 0-1). Handles hex (3, 4,
// 6 or 8 digits), rgb()/rgba() in both comma and space/slash syntax, and one
// level of color-mix(in <space>, A p%, B) (its own arguments may nest).
export function parseColor(value) {
  const v = value.trim();
  if (v in NAMED) return { ...NAMED[v] };

  let m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (m) {
    let hex = m[1];
    if (hex.length <= 4) hex = [...hex].map((c) => c + c).join('');
    return {
      r: hexPair(hex, 0),
      g: hexPair(hex, 2),
      b: hexPair(hex, 4),
      a: hex.length === 8 ? hexPair(hex, 6) / 255 : 1,
    };
  }

  m = v.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%)?)?\s*\)$/i,
  );
  if (m) {
    const [, r, g, b, a, pct] = m;
    const alpha = a === undefined ? 1 : pct ? Number(a) / 100 : Number(a);
    return { r: Number(r), g: Number(g), b: Number(b), a: alpha };
  }

  m = v.match(/^color-mix\(in\s+([\w-]+)\s*,\s*(.+)\)$/i);
  if (m) {
    const space = m[1].toLowerCase();
    if (space !== 'srgb') {
      throw new Error(`contrast.mjs: only srgb color-mix is supported (got "in ${m[1]}")`);
    }
    const [rawA, rawB] = splitTopLevel(m[2]);
    if (rawB === undefined) throw new Error(`contrast.mjs cannot parse color: ${value}`);
    const { color: colorA, pct: pctA } = splitColorAndPercent(rawA);
    const { color: colorB, pct: pctB } = splitColorAndPercent(rawB);
    const a = parseColor(colorA);
    const b = parseColor(colorB);

    let wa = pctA;
    let wb = pctB;
    if (wa == null && wb == null) {
      wa = 50;
      wb = 50;
    } else if (wa == null) {
      wa = 100 - wb;
    } else if (wb == null) {
      wb = 100 - wa;
    }
    const sum = wa + wb;
    if (sum <= 0) {
      throw new Error(`contrast.mjs: color-mix percentages must sum to more than 0% (${value})`);
    }
    const alphaMultiplier = Math.min(sum, 100) / 100;
    const w1 = wa / sum;

    // Premultiply by alpha before mixing so a transparent component doesn't
    // pull the mixed color's rgb toward black (CSS Color 4 §13).
    const preA = { r: a.r * a.a, g: a.g * a.a, b: a.b * a.a };
    const preB = { r: b.r * b.a, g: b.g * b.a, b: b.b * b.a };
    const alpha = (a.a * w1 + b.a * (1 - w1)) * alphaMultiplier;
    const unpremultiply = (channel) => (alpha === 0 ? 0 : channel / alpha);

    return {
      r: unpremultiply(preA.r * w1 + preB.r * (1 - w1)),
      g: unpremultiply(preA.g * w1 + preB.g * (1 - w1)),
      b: unpremultiply(preA.b * w1 + preB.b * (1 - w1)),
      a: alpha,
    };
  }

  throw new Error(`contrast.mjs cannot parse color: ${value}`);
}

// Splits `color-mix()`'s two comma-separated arguments, ignoring a comma
// nested inside either argument's own function call.
function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
    else if (text[i] === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts;
}

// Splits a color-mix argument ("<color>" or "<color> <percentage>") into its
// color and an optional weight, recognising the percentage only as the last
// top-level (not-inside-parens) whitespace-separated token.
function splitColorAndPercent(arg) {
  const tokens = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < arg.length; i++) {
    if (arg[i] === '(') depth++;
    else if (arg[i] === ')') depth--;
    else if (arg[i] === ' ' && depth === 0) {
      if (i > start) tokens.push(arg.slice(start, i));
      start = i + 1;
    }
  }
  if (start < arg.length) tokens.push(arg.slice(start));

  const last = tokens.at(-1);
  if (tokens.length > 1 && /^[\d.]+%$/.test(last)) {
    return { color: tokens.slice(0, -1).join(' '), pct: Number(last.slice(0, -1)) };
  }
  return { color: arg, pct: null };
}

// Composites a possibly-translucent color over an opaque ground (default
// white) and returns the resulting solid [r, g, b].
export function opaque(color, ground = [255, 255, 255]) {
  if (color.a >= 1) return [color.r, color.g, color.b];
  return [color.r, color.g, color.b].map((channel, i) =>
    Math.round(channel * color.a + ground[i] * (1 - color.a)),
  );
}

export function relativeLuminance([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function contrastRatio(one, two) {
  const [hi, lo] = [relativeLuminance(one), relativeLuminance(two)].sort(
    (x, y) => y - x,
  );
  return (hi + 0.05) / (lo + 0.05);
}

// The first top-level comma in `text` not nested inside a function call, or
// -1 if there is none.
function topLevelCommaIndex(text) {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
    else if (text[i] === ',' && depth === 0) return i;
  }
  return -1;
}

// Reads every `--custom-property: value;` declaration in `cssText` and
// resolves var() chains (with fallbacks), so a token defined as
// `var(--color-yellow-500)` resolves to the hex or rgb() it ultimately names.
// Only declarations on a top-level `:root`/`html` rule (outside any at-rule,
// e.g. `@media (prefers-color-scheme: dark)`) are read, so a dark-mode
// override doesn't leak into the light-mode value this checks.
export function resolveTokens(cssText) {
  const root = postcss.parse(cssText);
  const raw = new Map();

  root.walkDecls((decl) => {
    if (!decl.prop.startsWith('--')) return;
    const rule = decl.parent;
    if (!rule || rule.parent !== root) return;
    // Tailwind emits `@theme` declarations on :root, so they count as root tokens.
    const isTheme = rule.type === 'atrule' && rule.name === 'theme';
    const isRoot = rule.type === 'rule' && rule.selectors.some((s) => /^(:root|html)$/i.test(s.trim()));
    if (!isTheme && !isRoot) return;
    raw.set(decl.prop, decl.value.trim());
  });

  const resolved = new Map();

  // Replaces every var() in `value`, walking a balanced-paren scan so a
  // nested fallback (`var(--a, var(--b, #123456))`) resolves correctly
  // instead of a regex stopping at the first `)`.
  const resolveValue = (value, seen) => {
    let out = '';
    let i = 0;
    while (i < value.length) {
      if (!value.startsWith('var(', i)) {
        out += value[i];
        i++;
        continue;
      }
      let depth = 1;
      let j = i + 4;
      while (j < value.length && depth > 0) {
        if (value[j] === '(') depth++;
        else if (value[j] === ')') depth--;
        j++;
      }
      const inner = value.slice(i + 4, j - 1);
      const commaAt = topLevelCommaIndex(inner);
      const name = (commaAt === -1 ? inner : inner.slice(0, commaAt)).trim();
      const fallback = commaAt === -1 ? '' : resolveValue(inner.slice(commaAt + 1).trim(), seen);
      out += (raw.has(name) ? resolve(name, seen) : undefined) ?? fallback;
      i = j;
    }
    return out;
  };

  function resolve(name, seen) {
    if (resolved.has(name)) return resolved.get(name);
    if (seen.has(name)) throw new Error(`resolveTokens: circular var() chain at ${name}`);
    seen.add(name);
    const value = raw.has(name) ? resolveValue(raw.get(name), seen) : undefined;
    resolved.set(name, value);
    return value;
  }

  for (const name of raw.keys()) resolve(name, new Set());
  return Object.fromEntries(resolved);
}

const THRESHOLDS = { text: 4.5, large: 3, ui: 3 };

// Checks each { fg, bg, kind } pair (kind: "text" | "large" | "ui") against
// its WCAG AA threshold. fg/bg are looked up in `tokens` first, or used as a
// literal CSS color when not a known token name. `ground` composites a
// translucent color (default white); pass one when checking, for example, a
// scrim meant to sit over a photo. Returns the failing pairs, with the ratio
// each one actually measured.
export function checkPairs(tokens, pairs, { ground } = {}) {
  const groundRgb = ground ? opaque(parseColor(ground)) : [255, 255, 255];
  const failures = [];

  for (const pair of pairs) {
    const bg = opaque(parseColor(tokens[pair.bg] ?? pair.bg), groundRgb);
    const fg = opaque(parseColor(tokens[pair.fg] ?? pair.fg), bg);
    const ratio = contrastRatio(fg, bg);
    const required = THRESHOLDS[pair.kind] ?? THRESHOLDS.text;

    if (ratio < required) {
      failures.push({ ...pair, ratio: Number(ratio.toFixed(2)), required });
    }
  }

  return failures;
}

// Sorts the pairs the way the project gate needs. A pair marked
// `"asDrawn": true` is a failure the design draws on purpose, so it is
// reported and never fails the suite. A failing unflagged pair is an error,
// and so is a flagged pair that now passes, so a stale flag gets removed.
// `checkPairs` stays the plain "which pairs fail" answer.
export function gatePairs(tokens, pairs, options) {
  const errors = [];
  const asDrawn = [];
  const stale = [];

  for (const pair of pairs) {
    const [failure] = checkPairs(tokens, [pair], options);

    if (failure && pair.asDrawn) asDrawn.push(failure);
    else if (failure) errors.push(failure);
    else if (pair.asDrawn) stale.push(pair);
  }

  return { errors, asDrawn, stale };
}

// CLI: `node scripts/contrast.mjs` from the theme root checks resources/css/contrast-pairs.json against global/variables.css.
async function main() {
  const { existsSync, readFileSync } = await import('node:fs');
  const variables = 'resources/css/global/variables.css';
  const pairsFile = 'resources/css/contrast-pairs.json';
  if (!existsSync(variables) || !existsSync(pairsFile)) {
    console.error(`contrast: ${!existsSync(variables) ? variables : pairsFile} not found — run from the theme root after css-foundation-wizard`);
    process.exit(2);
  }
  const { errors, asDrawn, stale } = gatePairs(resolveTokens(readFileSync(variables, 'utf8')), JSON.parse(readFileSync(pairsFile, 'utf8')));
  const name = (pair) => pair.label ?? `${pair.fg} on ${pair.bg}`;
  for (const pair of asDrawn) console.warn(`warn  ${name(pair)}  ${pair.ratio}:1 < ${pair.required}:1 (as drawn)`);
  for (const pair of errors) console.error(`fail  ${name(pair)}  ${pair.ratio}:1 < ${pair.required}:1`);
  for (const pair of stale) console.error(`fail  ${name(pair)}  passes now — remove "asDrawn"`);
  if (errors.length || stale.length) process.exit(1);
  console.log(`contrast: ${JSON.parse(readFileSync(pairsFile, 'utf8')).length} pairs pass`);
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) await main();
