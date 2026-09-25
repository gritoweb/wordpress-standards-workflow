import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { callPhp } from '../scripts/render-harness.mjs';

// theme/app — the base every test in this tree resolves its `require`d PHP
// files against.
export const appRoot = dirname(fileURLToPath(import.meta.url));

/**
 * Runs a static PHP method (or global function) from one or more kit-owned
 * class files, with an optional fixture `get_field()` standing in for ACF.
 *
 * This kit has no Composer PSR-4 autoload for `App\` (render-harness.mjs's
 * own doc comment: it only autoloads illuminate/view for the Blade
 * compiler), so a class under test has to be `require`d explicitly. Doing
 * that once here, instead of pasting the same require/fixture boilerplate
 * into every *.test.mjs, is what common.md's "no pasted stub blocks" rule is
 * asking for.
 *
 * @param {string} callable "App\\Settings\\SiteSettings::motion" or a
 *   bare global function name.
 * @param {unknown[]} args Positional arguments.
 * @param {object} [options]
 * @param {string[]} [options.requires] Absolute paths to `require`.
 * @param {Record<string, unknown>|null} [options.acf] When set, backs a
 *   fixture `get_field($name)` that reads from this object and makes
 *   `function_exists('get_field')` true. Omit to test the ACF-inactive path.
 */
export function callKitPhp(callable, args = [], { requires = [], acf = null, functions = [], ...env } = {}) {
  const fns = [];

  if (acf) {
    // base64, not a PHP array/JSON literal spliced into source: a raw value
    // (a URL, a title) could contain a quote, a $, or a backslash that PHP's
    // string parser or json_decode would misread.
    const encoded = Buffer.from(JSON.stringify(acf), 'utf8').toString('base64');
    fns.push(`$GLOBALS['__acf_fixture'] = json_decode(base64_decode('${encoded}'), true);`);
    fns.push("function get_field($name, $context = false) { return $GLOBALS['__acf_fixture'][$name] ?? null; }");
  }

  // Caller-supplied stubs (a base class, a WordPress function) run before the
  // requires they support, then the class files, in the order given.
  fns.push(...functions);

  for (const file of requires) {
    fns.push(`require '${file}';`);
  }

  return callPhp(callable, args, { ...env, functions: fns });
}

/**
 * Renders any Blade view under resources/views/, not only resources/views/
 * blocks/ (render-harness.mjs's own renderView() hard-codes that "blocks."
 * prefix — see its RENDER template). Goes through the same `view()` Blade
 * helper the harness already defines, via env.functions, rather than adding
 * a second Blade-compiling code path.
 */
export function renderTemplate(name, vars = {}, env = {}) {
  return callPhp('__kit_render_view', [name, vars], {
    ...env,
    functions: [
      ...(env.functions ?? []),
      "function __kit_render_view($name, $vars) { return (string) view($name, $vars)->render(); }",
    ],
  });
}
