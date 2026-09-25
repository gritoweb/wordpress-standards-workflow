// Kit-only. What an example's tests need to run from examples/, which mirrors
// a theme's resources/ folder but keeps the theme's own views out of its way.
// The PHP render reads one resources/ root, so this assembles it: the
// examples' blocks (a symlink), then the theme's views with the examples'
// views on top. It also points the PHP autoloader at examples/app.
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { APP_AUTOLOAD } from '../theme/app/Blocks/test-support.mjs';

export const kitRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const themeRoot = join(kitRoot, 'theme');
export const examplesRoot = join(kitRoot, 'examples');
export const examplesApp = join(examplesRoot, 'app');

let resources;

// Built on first use and removed when the process exits, the way the render
// harness treats its own workspace.
export function exampleResources() {
  if (resources) return resources;

  resources = mkdtempSync(join(tmpdir(), 'kit-examples-'));
  mkdirSync(join(resources, 'views'));
  symlinkSync(join(examplesRoot, 'blocks'), join(resources, 'blocks'));
  cpSync(join(themeRoot, 'resources', 'views'), join(resources, 'views'), { recursive: true, dereference: true });

  const views = join(examplesRoot, 'views');
  if (existsSync(views)) cpSync(views, join(resources, 'views'), { recursive: true, dereference: true, force: true });

  process.on('exit', () => rmSync(resources, { recursive: true, force: true }));

  return resources;
}

// The sample content type, as a site that copies it would load it.
export const SAMPLE_CONTENT_TYPES = [
  "if (! function_exists('add_action')) { function add_action() {} }",
  `require ${JSON.stringify(join(examplesApp, 'content-types.php'))};`,
];

// The env a renderBlock() call needs for an example: the assembled resources,
// the autoloader, and get_template_directory() (which BlockAttributes reads
// for kit.config.json) pointing at `templateDirectory`.
export function exampleEnv({ functions = [], templateDirectory = themeRoot, ...rest } = {}) {
  return {
    root: exampleResources(),
    appRoots: [examplesApp],
    ...rest,
    functions: [
      APP_AUTOLOAD,
      `function get_template_directory() { return ${JSON.stringify(templateDirectory)}; }`,
      ...functions,
      // After a test's own: a block.php enqueues its vendor handle (Swiper); the render only needs the call to exist.
      "if (! function_exists('wp_enqueue_script')) { function wp_enqueue_script(...$args) {} }",
      "if (! function_exists('wp_enqueue_style')) { function wp_enqueue_style(...$args) {} }",
    ],
  };
}
