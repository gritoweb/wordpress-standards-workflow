import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

// Decides the cascade for tests. Handles layers (unlayered beats layered,
// later layer beats earlier), specificity, source order and !important.
// !important inverts layer order (an earlier layer then wins); inheritance
// is out of scope.
//
//   const css = cascade(source)
//   css.winner(element, 'transform', { media })  // the declaration that wins
//   css.all(element, prop, { media })            // every match, weakest first
//   css.decls                                    // every parsed declaration
//
// The element is a witness selector: a path from the root, plus the state it
// is in. `.is-animated main [data-part]:hover` is a part inside a section,
// hovered. A `::before` on the last compound asks
// for that pseudo-element. A pseudo-class the helper cannot know (`:hover`,
// `:dir(rtl)`) matches only when the witness lists it.
// `media` lists the conditions that are on, for example
// `['(prefers-reduced-motion: reduce)']`. Any at-rule not listed is off.
//
// This resolves hand-written CSS only: it walks the declarations PostCSS
// parses from the source text you pass it. It never sees Tailwind's utility
// classes or an `@apply` body, because those exist only after Tailwind
// compiles the file. Feed it `block.css` and other hand-written sheets
// directly; for a sheet that leans on utilities, compile it first (for
// example with `@tailwindcss/node`) and feed the resolver the compiled CSS.

const clean = (text) =>
  text
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
const unquote = (value) => String(value ?? '').replace(/^(['"])(.*)\1$/, '$2');
const isElementPseudo = (node) =>
  node.value.startsWith('::') || /^:(before|after)$/.test(node.value);

const parseSelectors = (text) => {
  const list = [];
  selectorParser((root) =>
    root.each((selector) => list.push(selector)),
  ).processSync(text);
  return list;
};

const FUNCTIONAL = /^:(not|is|where|matches|has)$/;
function specificity(selector) {
  const s = [0, 0, 0];
  for (const node of selector.nodes) {
    if (node.type === 'id') s[0]++;
    else if (node.type === 'class' || node.type === 'attribute') s[1]++;
    else if (node.type === 'tag') s[2]++;
    else if (node.type === 'pseudo' && isElementPseudo(node)) s[2]++;
    else if (node.type === 'pseudo' && !FUNCTIONAL.test(node.value)) s[1]++;
    else if (node.type === 'pseudo' && node.value !== ':where') {
      // :is(), :not() and :has() count as their most specific argument.
      const arg = node.nodes.map(specificity).sort(compare).pop() ?? [0, 0, 0];
      for (let i = 0; i < 3; i++) s[i] += arg[i];
    }
  }
  return s;
}
const compare = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

// A selector as compounds joined by combinators, left to right.
function compounds(selector) {
  const out = [{ nodes: [], combinator: null }];
  for (const node of selector.nodes) {
    if (node.type === 'combinator') {
      out.push({ nodes: [], combinator: node.value.trim() || ' ' });
    } else if (node.type !== 'comment') {
      out.at(-1).nodes.push(node);
    }
  }
  return out;
}

// The witness compound as data the rule matcher can test.
function element(text) {
  const [selector] = parseSelectors(text);
  const path = compounds(selector).map(({ nodes }) => {
    const el = {
      tag: null,
      classes: new Set(),
      attrs: new Map(),
      states: new Set(),
      pseudoElement: null,
    };
    for (const node of nodes) {
      if (node.type === 'tag') el.tag = node.value.toLowerCase();
      else if (node.type === 'class') el.classes.add(node.value);
      else if (node.type === 'id') el.attrs.set('id', node.value);
      else if (node.type === 'attribute')
        el.attrs.set(node.attribute, unquote(node.value ?? ''));
      else if (node.type === 'pseudo' && isElementPseudo(node))
        el.pseudoElement = node.value.replace(/^::?/, '');
      else if (node.type === 'pseudo')
        el.states.add(node.toString().trim().slice(1).replace(/\s+/g, ''));
    }
    return el;
  });
  return path;
}

function matchesNode(node, path, at) {
  const el = path[at];
  switch (node.type) {
    case 'universal':
      return true;
    case 'tag':
      return el.tag === node.value.toLowerCase();
    case 'class':
      return el.classes.has(node.value);
    case 'id':
      return el.attrs.get('id') === node.value;
    case 'attribute': {
      if (node.attribute === 'class' && !node.operator)
        return el.classes.size > 0;
      if (!el.attrs.has(node.attribute)) return false;
      if (!node.operator) return true;
      if (node.operator !== '=')
        throw new Error(`unsupported attribute operator ${node.operator}`);
      return el.attrs.get(node.attribute) === unquote(node.value);
    }
    case 'pseudo': {
      if (isElementPseudo(node)) return true; // checked separately
      if (node.value === ':not')
        return !node.nodes.some((s) => matchesSelector(s, path, at));
      if (
        node.value === ':is' ||
        node.value === ':where' ||
        node.value === ':matches'
      ) {
        return node.nodes.some((s) => matchesSelector(s, path, at));
      }
      if (node.value === ':root') return el.tag === 'html';
      if (node.value === ':has') throw new Error(':has() is not supported');
      return el.states.has(node.toString().trim().slice(1).replace(/\s+/g, ''));
    }
    default:
      throw new Error(`unsupported selector node ${node.type}`);
  }
}

const matchesCompound = (nodes, path, at) =>
  nodes.every((node) => matchesNode(node, path, at));

// Right to left, backtracking over descendant combinators. `+` and `~` ask
// for a sibling, which the witness path (an ancestor chain) cannot express,
// so they throw rather than guess at an ancestor match.
function matchesSelector(selector, path, at = path.length - 1) {
  const parts = compounds(selector);
  const walk = (index, position) => {
    if (!matchesCompound(parts[index].nodes, path, position)) return false;
    if (index === 0) return true;
    const combinator = parts[index].combinator;
    if (combinator === '+' || combinator === '~')
      throw new Error(`sibling combinator "${combinator}" is not supported`);
    if (combinator === '>') {
      return position > 0 && walk(index - 1, position - 1);
    }
    for (let up = position - 1; up >= 0; up--)
      if (walk(index - 1, up)) return true;
    return false;
  };
  return walk(parts.length - 1, at);
}

const lastPseudoElement = (selector) => {
  const last = compounds(selector)
    .at(-1)
    .nodes.filter((n) => n.type === 'pseudo' && isElementPseudo(n));
  return last.length ? last[0].value.replace(/^::?/, '') : null;
};

export function cascade(source) {
  const root = postcss.parse(source);
  const layers = [];
  const decls = [];
  let order = 0;

  // A layer's position is set by whichever comes first in the source: an
  // `@layer a, b;` statement (which fixes the order of names that may not
  // get any rules until later, or ever) or an `@layer name { ... }` block.
  // Registering both in one document-order pass keeps a block that appears
  // ahead of its statement at its true, earlier position.
  root.walk((node) => {
    if (node.type !== 'atrule' || node.name !== 'layer') return;
    const names = node.nodes
      ? [node.params.trim() || '<anonymous>']
      : node.params.split(',').map((n) => n.trim()).filter(Boolean);
    for (const name of names) {
      if (!layers.includes(name)) layers.push(name);
    }
  });

  root.walkDecls((decl) => {
    const rule = decl.parent;
    if (rule.type !== 'rule') return;
    const chain = [];
    let layer = null;
    for (
      let node = rule.parent;
      node && node.type !== 'root';
      node = node.parent
    ) {
      if (node.type === 'rule') {
        throw new Error(
          'css-cascade does not support native CSS nesting (e.g. `.a { .b { ... } }`); flatten nested rules first (for example with postcss-nested) before calling cascade().',
        );
      }
      if (node.type !== 'atrule') continue;
      if (node.name === 'keyframes' || /-keyframes$/.test(node.name)) return;
      if (node.name === 'layer') {
        layer = node.params.trim() || '<anonymous>';
      } else {
        chain.push(`@${node.name} ${clean(node.params)}`);
      }
    }
    const layerIndex = layer === null ? null : layers.indexOf(layer);
    for (const selector of parseSelectors(
      rule.selector.replace(/\/\*[\s\S]*?\*\//g, ''),
    )) {
      decls.push({
        prop: decl.prop,
        value: clean(decl.value),
        important: decl.important === true,
        selector: clean(selector.toString()),
        parsed: selector,
        specificity: specificity(selector),
        layer: layerIndex,
        media: chain,
        order: order++,
      });
    }
  });

  // A normal declaration in a later layer beats an earlier one, and an
  // unlayered declaration beats every layered one. `!important` inverts
  // both: an earlier layer beats a later one, and a layered `!important`
  // beats an unlayered `!important`. Both branches stay in the finite range
  // `[0, layers.length]` so the comparison never subtracts two Infinities
  // (which is NaN).
  function layerRank(d) {
    if (d.layer === null) return d.important ? 0 : layers.length;
    return d.important ? layers.length - d.layer : d.layer;
  }

  const rank = (a, b) =>
    Number(a.important) - Number(b.important) ||
    layerRank(a) - layerRank(b) ||
    compare(a.specificity, b.specificity) ||
    a.order - b.order;

  function all(witness, prop, { media = [] } = {}) {
    const path = element(witness);
    const target = path.at(-1);
    const active = new Set(media.map((m) => clean(m)));
    return decls
      .filter((d) => d.prop === prop)
      .filter((d) =>
        d.media.every(
          (m) => active.has(m.replace(/^@media /, '')) || active.has(m),
        ),
      )
      .filter((d) => lastPseudoElement(d.parsed) === target.pseudoElement)
      .filter((d) => matchesSelector(d.parsed, path))
      .sort(rank);
  }

  return {
    decls,
    all,
    winner: (witness, prop, options) => all(witness, prop, options).at(-1),
  };
}

export const REDUCED = '(prefers-reduced-motion: reduce)';
