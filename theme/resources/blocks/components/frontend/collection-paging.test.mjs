import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const source = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'collection-paging.js'),
  'utf8',
);
const focusLog = [];
const ORIGIN = 'https://site.test/directory/';

// The smallest DOM the script touches: a control per collection holding one
// link, and a list of items per collection.
function makeElement(attrs = {}, children = []) {
  const el = {
    attrs: { ...attrs },
    children,
    parent: null,
    style: { setProperty() {}, removeProperty() {} },
    getAttribute: (name) => (name in el.attrs ? el.attrs[name] : null),
    setAttribute: (name, value) => {
      el.attrs[name] = String(value);
    },
    removeAttribute: (name) => {
      delete el.attrs[name];
    },
    closest(selector) {
      for (let node = el; node; node = node.parent) {
        if (node.matches && node.matches(selector)) return node;
      }
      return null;
    },
    matches: (selector) =>
      (selector === '[data-paging]' && 'data-paging' in el.attrs) ||
      (selector === '[data-paging-more]' && 'data-paging-more' in el.attrs),
    querySelector: () => null,
    focus() {
      focusLog.push(el);
    },
    appendChild(node) {
      el.children.push(node);
    },
    replaceWith() {},
    remove() {},
  };
  Object.defineProperty(el, 'href', {
    get: () => el.attrs.href,
    set: (value) => {
      el.attrs.href = value;
    },
  });
  children.forEach((child) => {
    child.parent = el;
  });
  return el;
}

function collection(key, page, pages) {
  const item = () => makeElement({}, []);
  const list = makeElement({ id: key }, Array.from({ length: page }, item));
  const link = makeElement({
    href: `${ORIGIN}?${key}=${page + 1}#${key}`,
    'data-paging-more': '',
  });
  const control = makeElement({ 'data-paging': key }, [link]);
  const nextList = makeElement(
    { id: key },
    Array.from({ length: page + 1 }, item),
  );
  return { key, list, link, control, nextList, hasMore: page + 1 < pages };
}

async function run(collections, clickKey, startUrl, deferred, opts = {}) {
  const listeners = [];
  const fetched = [];
  const replaced = [];
  const location = { href: startUrl };
  const timers = [];
  focusLog.length = 0;
  const byId = new Map(collections.map((c) => [c.key, c.list]));
  const cssEscapeCalls = [];

  globalThis.window = {
    location,
    setTimeout: (fn) => timers.push(fn),
    clearTimeout() {},
    CSS: {
      escape: (value) => {
        cssEscapeCalls.push(value);
        return opts.cssEscape ? opts.cssEscape(value) : value;
      },
    },
  };
  globalThis.document = {
    activeElement: opts.activeElement ? opts.activeElement(collections) : null,
    addEventListener: (type, handler) => listeners.push(handler),
    getElementById: (id) => byId.get(id) || null,
    querySelectorAll: (selector) =>
      selector === '[data-paging] a[href]'
        ? [
            ...collections.map((c) => c.link),
            ...(opts.replacement?.attached ? [opts.replacement.link] : []),
          ]
        : [],
    importNode: (node) => node,
    createElement: () => makeElement(),
  };
  globalThis.history = {
    state: null,
    replaceState: (state, title, url) => {
      replaced.push(url);
      location.href = new URL(url, location.href).href;
    },
  };
  const pending = [];
  globalThis.fetch = (url, init) => {
    fetched.push(url);
    if (opts.stall) {
      return new Promise((resolve, reject) => {
        init.signal.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      });
    }
    const response = { ok: true, text: () => Promise.resolve('') };
    return deferred
      ? new Promise((resolve) => pending.push(() => resolve(response)))
      : Promise.resolve(response);
  };
  globalThis.DOMParser = class {
    parseFromString() {
      return {
        getElementById: (id) =>
          collections.find((c) => c.key === id)?.nextList || null,
        querySelector: (selector) => {
          opts.querySelectorCalls?.push(selector);
          return opts.replacement?.node || null;
        },
      };
    }
  };

  new Function(source)();
  const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
  [].concat(clickKey).forEach((key) => {
    const clicked = collections.find((c) => c.key === key);
    listeners[0]({
      target: { closest: (sel) => clicked.link.closest(sel) },
      defaultPrevented: false,
      button: 0,
      preventDefault() {},
    });
  });
  const busyWhilePending = collections.map((c) =>
    c.link.getAttribute('aria-busy'),
  );
  if (opts.stall) {
    // The deadline is the first timer the click scheduled.
    timers.forEach((fn) => fn());
  }
  // `deferred` lists request indexes in the order their responses arrive.
  for (const index of deferred || []) {
    pending[index]();
    await tick();
  }
  await tick();
  delete globalThis.window.__PREFIX__CollectionPaging;
  const busyAfter = collections.map((c) => c.link.getAttribute('aria-busy'));

  return { fetched, replaced, location, busyWhilePending, busyAfter, focusLog, cssEscapeCalls };
}

test('load more keeps another collection’s page argument in the fetched and stored URL', async () => {
  const primary = collection('primary-page', 2, 4);
  const secondary = collection('secondary-page', 1, 4);
  const { fetched, replaced } = await run(
    [primary, secondary],
    'secondary-page',
    `${ORIGIN}?primary-page=2#primary-page`,
  );

  const params = (url) => [...new URL(url).searchParams.entries()];
  assert.deepEqual(params(fetched[0]), [
    ['primary-page', '2'],
    ['secondary-page', '2'],
  ]);
  assert.deepEqual(params(replaced[0]), [
    ['primary-page', '2'],
    ['secondary-page', '2'],
  ]);
});

test('load more updates the other collection’s links so they keep the new page', async () => {
  const primary = collection('primary-page', 2, 4);
  const secondary = collection('secondary-page', 1, 4);
  await run([primary, secondary], 'secondary-page', `${ORIGIN}?primary-page=2#primary-page`);

  const url = new URL(primary.link.href);
  assert.equal(url.searchParams.get('secondary-page'), '2');
  assert.equal(url.searchParams.get('primary-page'), '3');
  assert.equal(url.hash, '#primary-page');
});

// Two Load more clicks in flight at once: whichever response lands last must
// still keep the page the other one committed.
for (const order of [
  [0, 1],
  [1, 0],
]) {
  test(`overlapping load more keeps both pages when responses arrive ${order}`, async () => {
    const primary = collection('primary-page', 1, 4);
    const secondary = collection('secondary-page', 1, 4);
    const { replaced, location } = await run(
      [primary, secondary],
      ['primary-page', 'secondary-page'],
      ORIGIN,
      order,
    );

    const url = new URL(location.href);
    assert.equal(url.searchParams.get('primary-page'), '2');
    assert.equal(url.searchParams.get('secondary-page'), '2');
    assert.equal(replaced.length, 2);
  });
}

test('load more link is aria-busy while its request is pending', async () => {
  const primary = collection('primary-page', 1, 4);
  const { busyWhilePending } = await run([primary], 'primary-page', ORIGIN, [0]);

  assert.equal(busyWhilePending[0], 'true');
});

test('an appended item drops the entrance part marker and keeps the reveal', async () => {
  const primary = collection('primary-page', 1, 4);
  const styles = { '--e-i': '3' };
  const late = makeElement({ 'data-entrance-part': '' });
  late.style = {
    setProperty: (name, value) => {
      styles[name] = value;
    },
    removeProperty: (name) => {
      delete styles[name];
    },
  };
  // The fetched page renders the marker and its stagger index on every item.
  // The section has already entered, so the marker would only add a second
  // hidden state on the element the reveal animation targets.
  primary.nextList.children[1] = late;
  await run([primary], 'primary-page', ORIGIN);

  assert.equal(primary.list.children[1], late);
  assert.equal(late.getAttribute('data-entrance-part'), null);
  assert.equal(styles['--e-i'], undefined);
  assert.equal(late.getAttribute('data-revealing'), '');
  assert.equal(styles['--reveal-i'], 0);
});

test('the replacement control is looked up through window.CSS.escape(key), not a raw concatenation', async () => {
  const primary = collection('primary-page', 1, 4);
  const querySelectorCalls = [];
  await run([primary], 'primary-page', ORIGIN, null, {
    querySelectorCalls,
    cssEscape: (value) => `ESCAPED(${value})`,
  });

  assert.deepEqual(querySelectorCalls, ['[data-paging="ESCAPED(primary-page)"]']);
});

test('a stalled request times out, restores the control and shows the default message', async () => {
  const primary = collection('primary-page', 1, 4);
  let status = null;
  primary.control.appendChild = (node) => {
    status = node;
  };
  const { busyAfter, location } = await run([primary], 'primary-page', ORIGIN, null, {
    stall: true,
  });

  assert.equal(busyAfter[0], null);
  assert.equal(location.href, ORIGIN);
  assert.ok(status, 'a message is added to the control');
  assert.equal(status.getAttribute('role'), 'status');
  assert.equal(status.textContent, 'This is taking too long. Try again.');
});

test('a stalled request prefers the control’s own translated timeout message when the Blade partial sets one', async () => {
  const primary = collection('primary-page', 1, 4);
  primary.control.attrs['data-paging-timeout-message'] = 'Está tardando demais. Tente de novo.';
  let status = null;
  primary.control.appendChild = (node) => {
    status = node;
  };
  await run([primary], 'primary-page', ORIGIN, null, { stall: true });

  assert.equal(status.textContent, 'Está tardando demais. Tente de novo.');
});

test('focus moves to the first new item only when the visitor is still on the button', async () => {
  const primary = collection('primary-page', 1, 4);
  const { focusLog: stayed } = await run([primary], 'primary-page', ORIGIN, null, {
    activeElement: ([c]) => c.link,
  });
  assert.equal(stayed.length, 1);

  const other = collection('primary-page', 1, 4);
  const elsewhere = makeElement();
  const { focusLog: moved } = await run([other], 'primary-page', ORIGIN, null, {
    activeElement: () => elsewhere,
  });
  assert.equal(moved.length, 0);
});

test('the replacement link keeps the other collection’s page after overlapping requests', async () => {
  const primary = collection('primary-page', 1, 4);
  const secondary = collection('secondary-page', 1, 4);
  // The replacement control the fetched page brings has stale hrefs.
  const stale = makeElement({
    href: `${ORIGIN}?primary-page=3#primary-page`,
    'data-paging-more': '',
  });
  const replacement = makeElement({ 'data-paging': 'primary-page' }, [stale]);
  const swap = { node: replacement, link: stale, attached: false };
  primary.control.replaceWith = () => {
    swap.attached = true;
  };
  await run([primary, secondary], ['primary-page', 'secondary-page'], ORIGIN, [1, 0], {
    replacement: swap,
  });

  const url = new URL(stale.href);
  assert.equal(url.searchParams.get('secondary-page'), '2');
});
