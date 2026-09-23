#!/usr/bin/env node
/**
 * Editor fidelity report: which blocks look different in the editor canvas
 * than on the page. Reports only — it never edits a file.
 *
 *   WP_URL=https://site.lndo.site WP_USER=admin WP_PASS=secret \
 *     node scripts/editor-fidelity.mjs [slug ...] [--json]
 *
 * Opens headless Chrome, inserts the theme's blocks (default attributes) into a
 * draft page, reads every visible text in the canvas, opens the draft's
 * preview at the canvas's own width (so Tailwind breakpoints match) and
 * compares the same texts' computed styles. The draft is deleted at the end.
 * Needs Node 22+ (global WebSocket) and Chrome; no npm packages.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const only = args.filter((arg) => !arg.startsWith('--'));
const { WP_URL, WP_USER, WP_PASS } = process.env;
const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);

if (!WP_URL || !WP_USER || !WP_PASS) {
  console.error('Set WP_URL, WP_USER and WP_PASS (a local admin). Example:\n  WP_URL=https://site.lndo.site WP_USER=admin WP_PASS=secret node scripts/editor-fidelity.mjs');
  process.exit(2);
}
if (!CHROME) {
  console.error('Chrome not found; set CHROME_PATH.');
  process.exit(2);
}

const namespace = readFileSync('app/Blocks/BlockManager.php', 'utf8').match(/\$namespace\s*=\s*'([^']+)'/)?.[1];
if (!namespace) {
  console.error('Could not read $namespace from app/Blocks/BlockManager.php (run from the theme root).');
  process.exit(2);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = WP_URL.replace(/\/$/, '');

// --- Chrome DevTools Protocol, just enough of it -----------------------------

async function launchChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'editor-fidelity-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--ignore-certificate-errors', '--no-first-run', '--no-default-browser-check',
    '--window-size=1600,1100', 'about:blank',
  ], { stdio: 'ignore', detached: true });

  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = await connect(pages.find((target) => target.type === 'page').webSocketDebuggerUrl);

  return {
    page,
    async close() {
      page.socket.close();
      // Chrome keeps writing its profile until it exits; removing it earlier fails.
      const exited = new Promise((resolve) => chrome.once('exit', resolve));
      // The whole process group: Chrome's helpers (crash handler, GPU) outlive the main process otherwise.
      try {
        process.kill(-chrome.pid, 'SIGKILL');
      } catch {
        chrome.kill('SIGKILL');
      }
      await Promise.race([exited, sleep(5000)]);
      // Chrome's helpers may still flush for a moment; a leftover temp profile is harmless.
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          rmSync(profile, { recursive: true, force: true });
          return;
        } catch {
          await sleep(500);
        }
      }
    },
  };
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const pending = new Map();
    let id = 0;
    const send = (method, params = {}) =>
      new Promise((ok, fail) => {
        pending.set(++id, { ok, fail });
        socket.send(JSON.stringify({ id, method, params }));
      });

    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.method === 'Page.javascriptDialogOpening') {
        send('Page.handleJavaScriptDialog', { accept: true });
      }
      const call = pending.get(message.id);
      if (!call) return;
      pending.delete(message.id);
      if (message.error) call.fail(new Error(message.error.message));
      else call.ok(message.result);
    };
    socket.onerror = reject;
    socket.onopen = async () => {
      await send('Page.enable');
      resolve({
        socket,
        send,
        async evaluate(expression) {
          const { result, exceptionDetails } = await send('Runtime.evaluate', {
            expression, awaitPromise: true, returnByValue: true,
          });
          if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
          return result.value;
        },
        async goto(target) {
          await send('Page.navigate', { url: target });
          await sleep(300);
          await this.waitFor('document.readyState === "complete"');
        },
        async waitFor(condition, timeout = 30000) {
          const end = Date.now() + timeout;
          while (Date.now() < end) {
            if (await this.evaluate(`(() => { try { return !!(${condition}); } catch { return false; } })()`)) return;
            await sleep(250);
          }
          throw new Error(`Timed out waiting for: ${condition}`);
        },
      });
    };
  });
}

// --- What is compared --------------------------------------------------------

// Runs in the page: every visible text inside `root`, with the styles that
// make it look the way it does. Textareas (the canvas's inline fields) count
// by their value.
const COLLECT = `(root, withFields) => {
  const clean = (text) => text.replace(/\\s+/g, ' ').trim();
  // oklch(), hex and rgb() name the same colour differently; paint one pixel and read it back as rgba.
  const paint = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgba = (color) => {
    paint.clearRect(0, 0, 1, 1);
    paint.fillStyle = color;
    paint.fillRect(0, 0, 1, 1);
    return 'rgba(' + paint.getImageData(0, 0, 1, 1).data.join(', ') + ')';
  };
  const items = [];
  const add = (el, raw) => {
    const text = clean(raw || '');
    // checkVisibility is false inside a closed <details> or display:none; opacity is ignored (entrance hides parts).
    if (text.length < 2 || !el.checkVisibility({ visibilityProperty: true })) return;
    const cs = getComputedStyle(el);
    items.push({
      text,
      cls: String(el.getAttribute('class') || ''),
      style: {
        'font-size': cs.fontSize, 'font-weight': cs.fontWeight, 'line-height': cs.lineHeight,
        'font-family': cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
        color: rgba(cs.color), 'text-align': { start: 'left', end: 'right' }[cs.textAlign] || cs.textAlign,
        'text-transform': cs.textTransform,
        'letter-spacing': cs.letterSpacing,
      },
    });
  };
  if (withFields) root.querySelectorAll('textarea').forEach((field) => add(field, field.value));
  const seen = new Set();
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node; (node = walker.nextNode()); ) {
    if (!node.textContent.trim()) continue;
    const el = node.parentElement;
    if (!el || seen.has(el) || el.closest('textarea, script, style, svg, .sr-only, [aria-hidden="true"]')) continue;
    seen.add(el);
    add(el, el.textContent);
  }
  const cs = getComputedStyle(root);
  return { items, root: { 'background-color': rgba(cs.backgroundColor), 'padding-top': cs.paddingTop } };
}`;

const PX = new Set(['font-size', 'line-height', 'letter-spacing', 'padding-top']);
const channels = (value) => (value.match(/[\d.]+/g) || []).map(Number);
function differs(prop, a, b) {
  if (PX.has(prop) && /px$/.test(a) && /px$/.test(b)) return Math.abs(parseFloat(a) - parseFloat(b)) > 0.5;
  // Colour conversions round by a unit or two per channel.
  if (/^rgba\(/.test(a) && /^rgba\(/.test(b)) return channels(a).some((value, i) => Math.abs(value - channels(b)[i]) > 2);
  return a !== b;
}

function compare(editor, front) {
  const issues = [];
  const notes = [];
  const unused = [...front.items];

  for (const [prop, value] of Object.entries(editor.root)) {
    if (differs(prop, value, front.root[prop])) {
      issues.push({ text: '(block root)', diff: `${prop} ${value} → ${front.root[prop]}` });
    }
  }

  for (const item of editor.items) {
    const at = unused.findIndex((candidate) => candidate.text === item.text);
    if (at < 0) {
      notes.push(`only in the editor: "${item.text.slice(0, 60)}"`);
      continue;
    }
    const match = unused.splice(at, 1)[0];
    const diffs = Object.entries(item.style)
      .filter(([prop, value]) => differs(prop, value, match.style[prop]))
      .map(([prop, value]) => `${prop} ${value} → ${match.style[prop]}`);
    if (diffs.length) {
      issues.push({ text: item.text.slice(0, 50), diff: diffs.join(', '), editorClass: item.cls, frontClass: match.cls });
    }
  }

  // Text the page shows and the canvas lacks: the front end changed alone.
  for (const item of unused) {
    issues.push({ text: item.text.slice(0, 50), diff: 'shown on the page, missing in the editor', frontClass: item.cls });
  }

  return { issues, notes };
}

// Content editing (text, links, buttons) belongs on the canvas; the sidebar is configuration only.
const CONTENT_FIELDS = /<(ActionEditor|LinkPicker|LinkControl|URLInput|RichText|AutoGrowingTextarea|TextareaControl|TextControl)\b(?![^>]*type=["']number["'])/g;

function sidebarContent(slug) {
  const file = join('resources/blocks', slug, 'block.jsx');
  if (!existsSync(file)) return [];
  const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const found = new Set();
  for (const [, inspector] of code.matchAll(/<InspectorControls>([\s\S]*?)<\/InspectorControls>/g)) {
    for (const [, name] of inspector.matchAll(CONTENT_FIELDS)) found.add(`<${name}>`);
  }
  return [...found];
}

// --- Run ---------------------------------------------------------------------

const { page, close } = await launchChrome();
let draftId = null;
let nonce = null;

try {
  await page.goto(`${base}/wp-login.php`);
  await page.evaluate(`(() => {
    document.getElementById('user_login').value = ${JSON.stringify(WP_USER)};
    document.getElementById('user_pass').value = ${JSON.stringify(WP_PASS)};
    document.getElementById('loginform').submit();
  })()`);
  await page.waitFor('location.pathname.startsWith("/wp-admin")', 20000).catch(() => {
    throw new Error('Login failed — check WP_USER / WP_PASS.');
  });

  await page.goto(`${base}/wp-admin/post-new.php?post_type=page`);
  await page.waitFor('window.wp?.data && document.querySelector(\'iframe[name="editor-canvas"]\')?.contentDocument?.body', 60000);
  await sleep(1500);

  // Widest canvas the window allows, so desktop breakpoints apply on both sides.
  const blocks = await page.evaluate(`(async () => {
    const { dispatch, select } = wp.data;
    dispatch('core/edit-post')?.closeGeneralSidebar?.();
    dispatch('core/preferences')?.set?.('core', 'welcomeGuide', false);
    const only = ${JSON.stringify(only)};
    const types = wp.blocks.getBlockTypes()
      .filter((type) => type.name.startsWith(${JSON.stringify(`${namespace}/`)}))
      .filter((type) => !only.length || only.includes(type.name.split('/')[1]));
    const created = types.map((type) => wp.blocks.createBlock(type.name));
    dispatch('core/block-editor').resetBlocks(created);
    dispatch('core/editor').editPost({ title: 'Editor fidelity check (temporary)', status: 'draft' });
    await dispatch('core/editor').savePost();
    return created.map((block) => ({ clientId: block.clientId, slug: block.name.split('/')[1] }));
  })()`);
  if (!blocks.length) throw new Error(`No ${namespace}/* blocks registered in the editor.`);

  await sleep(2500);
  const editor = await page.evaluate(`(() => {
    const frame = document.querySelector('iframe[name="editor-canvas"]');
    const doc = frame.contentDocument;
    const collect = ${COLLECT};
    return {
      width: Math.round(doc.documentElement.clientWidth),
      draftId: wp.data.select('core/editor').getCurrentPostId(),
      nonce: wp.apiFetch.nonceMiddleware?.nonce || window.wpApiSettings?.nonce || null,
      preview: wp.data.select('core/editor').getEditedPostPreviewLink(),
      blocks: ${JSON.stringify(blocks)}.map(({ clientId, slug }) => {
        const root = doc.querySelector('[data-block="' + clientId + '"]');
        const crashed = !!root?.querySelector('.block-editor-block-list__block-crash-warning');
        return { slug, crashed, ...(root && !crashed ? collect(root, true) : { items: [], root: {} }) };
      }),
    };
  })()`);
  draftId = editor.draftId;
  nonce = editor.nonce;

  await page.send('Emulation.setDeviceMetricsOverride', { width: editor.width, height: 1100, deviceScaleFactor: 1, mobile: false });
  await page.goto(editor.preview);
  await page.waitFor('document.fonts.status === "loaded"');
  await sleep(800);

  const front = await page.evaluate(`(() => {
    const collect = ${COLLECT};
    const seen = {};
    return ${JSON.stringify(blocks)}.map(({ slug }) => {
      const roots = [...document.querySelectorAll('.' + CSS.escape(slug))]
        .filter((el) => !el.parentElement.closest('.' + CSS.escape(slug)));
      const root = roots[seen[slug] = (seen[slug] ?? -1) + 1];
      return root ? collect(root, false) : null;
    });
  })()`);

  const report = editor.blocks.map((block, index) => {
    if (block.crashed) return { block: block.slug, issues: [{ text: '(block)', diff: 'the editor shows "This block has encountered an error"' }], notes: [] };
    if (!front[index]) return { block: block.slug, issues: [{ text: '(block)', diff: `no .${block.slug} root on the page (not rendered, or its root class is not the slug)` }], notes: [] };
    const result = compare(block, front[index]);
    const inSidebar = sidebarContent(block.slug);
    if (inSidebar.length) {
      result.issues.unshift({ text: '(sidebar)', diff: `${inSidebar.join(', ')} inside <InspectorControls> — text, links and buttons are edited on the canvas, never in the sidebar` });
    }
    return { block: block.slug, ...result };
  });

  const failing = report.filter((entry) => entry.issues.length);
  if (asJson) {
    console.log(JSON.stringify({ width: editor.width, report }, null, 1));
  } else {
    console.log(`[editor-fidelity] ${base} — ${report.length} blocks compared at ${editor.width}px\n`);
    for (const entry of report) {
      console.log(`${entry.issues.length ? '✗' : '✓'} ${entry.block}`);
      for (const issue of entry.issues) {
        console.log(`   "${issue.text}": ${issue.diff}   (editor → page)`);
        if (issue.frontClass) console.log(`      page class:   ${issue.frontClass}`);
        if (issue.editorClass) console.log(`      editor class: ${issue.editorClass}`);
      }
      for (const note of entry.notes) console.log(`   · ${note}`);
    }
    console.log(`\n${failing.length ? `${failing.length} block(s) differ.` : 'Editor and page match for every block.'}`);
  }
  process.exitCode = failing.length ? 1 : 0;
} catch (error) {
  console.error(`[editor-fidelity] ${error.message}`);
  process.exitCode = 2;
} finally {
  if (draftId) {
    // The page is now the front end, where wp.apiFetch doesn't exist: plain REST with the editor's nonce.
    await page.evaluate(`fetch(${JSON.stringify(`${base}/wp-json/wp/v2/pages/${draftId}?force=true`)}, {
      method: 'DELETE', credentials: 'include', headers: { 'X-WP-Nonce': ${JSON.stringify(nonce)} },
    }).then((r) => r.status)`).catch(() => null);
  }
  await close();
}
