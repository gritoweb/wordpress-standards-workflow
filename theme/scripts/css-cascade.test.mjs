import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cascade } from './css-cascade.mjs';

test('specificity: an id beats a class, a class beats a tag', () => {
  const css = cascade(`
    div { color: a; }
    .x { color: b; }
    #y { color: c; }
  `);

  assert.equal(cascade(`div{color:a}.x{color:b}`).winner('div.x', 'color').value, 'b');
  assert.equal(css.winner('div#y.x', 'color').value, 'c');
});

test('later source order wins a specificity tie', () => {
  const css = cascade(`.x { color: a; } .x { color: b; }`);

  assert.equal(css.winner('.x', 'color').value, 'b');
});

test('an unlayered normal declaration beats a layered one, regardless of order', () => {
  const css = cascade(`
    @layer a { .x { color: layered; } }
    .x { color: unlayered; }
  `);

  assert.equal(css.winner('.x', 'color').value, 'unlayered');
});

test('a later layer beats an earlier one for normal declarations', () => {
  const css = cascade(`
    @layer a, b;
    @layer b { .x { color: b; } }
    @layer a { .x { color: a; } }
  `);

  assert.equal(css.winner('.x', 'color').value, 'b');
});

test('!important inverts layer order: the earlier layer wins', () => {
  const css = cascade(`
    @layer a, b;
    @layer a { .x { color: a !important; } }
    @layer b { .x { color: b !important; } }
  `);

  assert.equal(css.winner('.x', 'color').value, 'a');
});

test('a layered !important beats an unlayered !important', () => {
  const css = cascade(`
    .x { color: unlayered !important; }
    @layer a { .x { color: layered !important; } }
  `);

  assert.equal(css.winner('.x', 'color').value, 'layered');
});

test('!important always beats a normal declaration, layers aside', () => {
  const css = cascade(`
    @layer a { .x { color: important !important; } }
    .x { color: normal; }
  `);

  assert.equal(css.winner('.x', 'color').value, 'important');
});

test('@layer a, b; fixes order for a layer whose rules appear later, or not at all', () => {
  const css = cascade(`
    @layer a, b;
    @layer a { .x { color: a; } }
    @layer b { .x { color: b; } }
  `);

  // b is declared after a in the statement, so it wins the normal cascade
  // even though nothing here reorders the blocks themselves.
  assert.equal(css.winner('.x', 'color').value, 'b');
});

test('a layer block that appears before its @layer statement keeps its earlier source position', () => {
  const css = cascade(`
    @layer b { .x { color: b; } }
    @layer a, b;
    @layer a { .x { color: a; } }
  `);

  // b is registered first (its block is first in the source), so a — later
  // — wins the normal cascade.
  assert.equal(css.winner('.x', 'color').value, 'a');
});

test('nested CSS rules throw a clear error instead of silently matching as top-level', () => {
  assert.throws(
    () => cascade(`.a { .b { color: red; } }`),
    /does not support native CSS nesting/,
  );
});

test('a sibling combinator throws instead of matching an ancestor', () => {
  const css = cascade(`.a + .b { color: red; }`);

  assert.throws(() => css.winner('.a .b', 'color'), /sibling combinator/);
  assert.throws(() => cascade(`.a ~ .b { color: red; }`).winner('.a .b', 'color'), /sibling combinator/);
});

test(':has() still throws, unaffected by the sibling fix', () => {
  const css = cascade(`.a:has(.b) { color: red; }`);

  assert.throws(() => css.winner('.a', 'color'), /:has\(\) is not supported/);
});

test('a pseudo-element only matches a witness that asks for it', () => {
  const css = cascade(`.x::before { content: "a"; }`);

  assert.equal(css.winner('.x::before', 'content').value, '"a"');
  assert.equal(css.winner('.x', 'content'), undefined);
});

test('an at-rule condition only matches when the witness lists it active', () => {
  const css = cascade(`
    @media (prefers-reduced-motion: reduce) {
      .x { animation: none; }
    }
  `);

  assert.equal(
    css.winner('.x', 'animation', {
      media: ['(prefers-reduced-motion: reduce)'],
    }).value,
    'none',
  );
  assert.equal(css.winner('.x', 'animation'), undefined);
});
