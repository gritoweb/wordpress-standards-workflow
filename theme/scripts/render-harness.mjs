import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const themeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// The one PHP renderer every block suite shares. Blade views run through the
// real compiler, and block.php runs as WordPress runs it. This harness knows
// nothing about a specific theme's classes or directives: a caller registers
// whatever Blade directives its blocks need with registerDirective(), and
// adds any WordPress function this harness doesn't fake with env.functions.
//
// WHAT THE FAKES GUARANTEE
//   esc_url, esc_url_raw  Reject any scheme outside WordPress's allowed list
//     (javascript:, data:, vbscript: give ''), strip characters a URL cannot
//     hold, and prefix http:// on a bare host. esc_url encodes & and '.
//   wp_kses_post          Drops every tag outside the post allow-list (its
//     text stays, as in WordPress), drops on* and every attribute outside a
//     fixed allow-list, and neutralises a bad protocol in href, src and cite.
//   wp_kses               Same tag/text handling, against the caller's own
//     ['tag' => ['attr' => ...]] allow-list instead of the post-wide one.
//   esc_attr, esc_html    Encode & < > " ' and do not double-encode entities.
//   sanitize_text_field   Removes script and style with their content, strips
//     tags and %xx octets, collapses whitespace, trims.
//   sanitize_html_class   Strips octets and everything but A-Za-z0-9_-.
//   wp_trim_words         Cuts to N words and appends $more, as WordPress does.
//   wp_get_attachment_image  Returns an <img> for a fixture attachment id,
//     with the same default arguments as WordPress core.
//
// WHAT THEY DO NOT GUARANTEE
//   kses does not filter CSS in `style` beyond dropping anything with a
//   parenthesis, does not know every WordPress tag, and does not repair
//   broken markup. Nothing here reaches a database, a hook, or a template
//   outside the resources root passed to it.
export const WP_ESCAPING = String.raw`
function absint($v) { return abs((int) $v); }
function wp_allowed_protocols() {
    return ['http', 'https', 'ftp', 'ftps', 'mailto', 'news', 'irc', 'irc6', 'ircs', 'gopher', 'nntp', 'feed', 'telnet', 'mms', 'rtsp', 'sms', 'svn', 'tel', 'fax', 'xmpp', 'webcal', 'urn'];
}
function wp_kses_bad_protocol($url) {
    $clean = preg_replace('/[\x00-\x20]+/', '', html_entity_decode($url, ENT_QUOTES | ENT_HTML5));
    if (preg_match('/^([a-z0-9+.-]+):/i', $clean, $m) && ! in_array(strtolower($m[1]), wp_allowed_protocols(), true)) {
        return preg_replace('/^[^:]*:/', '', $clean);
    }
    return $url;
}
function __test_url($v, $encode) {
    $url = trim((string) $v);
    if ($url === '') { return ''; }
    $url = str_ireplace(['%0d', '%0a'], '', str_replace(["\r", "\n"], '', $url));
    $url = preg_replace('|[^a-z0-9-~+_.?#=!&;,/:%@$\|*\'()\[\]\x80-\xff]|i', '', $url);
    if ($url === '') { return ''; }
    if (strpos($url, ':') === false && ! in_array($url[0], ['/', '#', '?'], true) && ! preg_match('/^[a-z0-9-]+?\.php/i', $url)) {
        $url = 'http://' . $url;
    }
    if ($encode) { $url = str_replace("'", '&#039;', str_replace('&', '&#038;', $url)); }
    if ($url[0] !== '/' && strtolower($url) !== strtolower(wp_kses_bad_protocol($url))) { return ''; }
    return $url;
}
function esc_url($v) { return __test_url($v, true); }
function esc_url_raw($v) { return __test_url($v, false); }
function esc_attr($v) { return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8', false); }
function esc_html($v) { return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8', false); }
function wp_strip_all_tags($v) {
    $v = preg_replace('@<(script|style)[^>]*?>.*?</\\1>@si', '', (string) $v);
    return trim(strip_tags($v));
}
function sanitize_text_field($v) {
    $v = (string) $v;
    if (strpos($v, '<') !== false) {
        $v = preg_replace_callback('%<[^>]*?((?=<)|>|$)%', fn ($m) => strpos($m[0], '>') === false ? esc_html($m[0]) : $m[0], $v);
        $v = wp_strip_all_tags($v);
    }
    $v = trim(preg_replace('/[\r\n\t ]+/', ' ', $v));
    while (preg_match('/%[a-f0-9]{2}/i', $v)) { $v = preg_replace('/%[a-f0-9]{2}/i', '', $v); }
    return trim($v);
}
function sanitize_html_class($v) {
    return preg_replace('/[^A-Za-z0-9_-]/', '', preg_replace('|%[a-fA-F0-9][a-fA-F0-9]|', '', (string) $v));
}
function wp_kses_post($v) {
    $tags = array_flip(explode(' ', 'a abbr acronym address article aside b bdo big blockquote br caption cite code col colgroup dd del details dfn div dl dt em figcaption figure footer h1 h2 h3 h4 h5 h6 header hgroup hr i img ins kbd li main mark nav ol p pre q s samp section small span strike strong sub summary sup table tbody td tfoot th thead time tr tt u ul var'));
    $attrs = ['href', 'src', 'alt', 'title', 'class', 'id', 'rel', 'target', 'width', 'height', 'colspan', 'rowspan', 'lang', 'dir', 'role', 'datetime', 'name', 'download', 'cite', 'style'];
    $out = '';
    foreach (preg_split('/(<[^>]*>)/', (string) $v, -1, PREG_SPLIT_DELIM_CAPTURE) as $piece) {
        if ($piece === '') { continue; }
        if ($piece[0] !== '<' || substr($piece, -1) !== '>') {
            $out .= str_replace(['<', '>'], ['&lt;', '&gt;'], $piece);
            continue;
        }
        if (! preg_match('%^<(/?)([a-z][a-z0-9]*)\b(.*?)(/?)>$%is', $piece, $m) || ! isset($tags[strtolower($m[2])])) { continue; }
        $name = strtolower($m[2]);
        if ($m[1] === '/') { $out .= "</$name>"; continue; }
        $kept = '';
        preg_match_all('/([a-z_:][-a-z0-9_:.]*)(?:\s*=\s*("[^"]*"|\'[^\']*\'|[^\s"\'>]+))?/i', $m[3], $found, PREG_SET_ORDER);
        foreach ($found as $f) {
            $key = strtolower($f[1]);
            $val = isset($f[2]) ? trim($f[2], '"\'') : '';
            $ok = in_array($key, $attrs, true) || str_starts_with($key, 'aria-') || str_starts_with($key, 'data-');
            if (! $ok) { continue; }
            if (in_array($key, ['href', 'src', 'cite'], true)) { $val = wp_kses_bad_protocol($val); }
            if ($key === 'style' && preg_match('/[()\\<>]|&#/', $val)) { continue; }
            $kept .= ' ' . $key . '="' . esc_attr($val) . '"';
        }
        $out .= "<$name$kept" . ($m[4] === '/' || in_array($name, ['br', 'hr', 'img'], true) ? ' /' : '') . '>';
    }
    return $out;
}
// A tag is kept only when it's a key of $allowedHtml; an attribute on it is
// kept only when it's a key of that tag's own array (WordPress's real
// per-tag allow-list shape, e.g. ['span' => ['class' => []]]) — narrower
// than wp_kses_post's one shared attribute list above, and the shape a
// block passes when it hand-picks a small inline allow-list for a heading.
function wp_kses($v, $allowedHtml) {
    $tags = array_change_key_case($allowedHtml);
    $out = '';
    foreach (preg_split('/(<[^>]*>)/', (string) $v, -1, PREG_SPLIT_DELIM_CAPTURE) as $piece) {
        if ($piece === '') { continue; }
        if ($piece[0] !== '<' || substr($piece, -1) !== '>') {
            $out .= str_replace(['<', '>'], ['&lt;', '&gt;'], $piece);
            continue;
        }
        if (! preg_match('%^<(/?)([a-z][a-z0-9]*)\b(.*?)(/?)>$%is', $piece, $m) || ! isset($tags[strtolower($m[2])])) { continue; }
        $name = strtolower($m[2]);
        if ($m[1] === '/') { $out .= "</$name>"; continue; }
        $allowedAttrs = array_change_key_case((array) $tags[$name]);
        $kept = '';
        preg_match_all('/([a-z_:][-a-z0-9_:.]*)(?:\s*=\s*("[^"]*"|\'[^\']*\'|[^\s"\'>]+))?/i', $m[3], $found, PREG_SET_ORDER);
        foreach ($found as $f) {
            $key = strtolower($f[1]);
            $val = isset($f[2]) ? trim($f[2], '"\'') : '';
            if (! isset($allowedAttrs[$key])) { continue; }
            if (in_array($key, ['href', 'src', 'cite'], true)) { $val = wp_kses_bad_protocol($val); }
            $kept .= ' ' . $key . '="' . esc_attr($val) . '"';
        }
        $out .= "<$name$kept" . ($m[4] === '/' || in_array($name, ['br', 'hr', 'img'], true) ? ' /' : '') . '>';
    }
    return $out;
}
function wp_trim_words($text, $num = 55, $more = null) {
    $words = preg_split('/[\n\r\t ]+/', trim(wp_strip_all_tags($text)), $num + 1, PREG_SPLIT_NO_EMPTY);
    if (count($words) > $num) {
        array_pop($words);
        return implode(' ', $words) . ($more ?? '&hellip;');
    }
    return implode(' ', $words);
}
`;

// The WordPress functions a theme's PHP classes call, backed by the `env` a
// test passes: { posts, attachments, currentPost, query, missingTypes,
// reverseTies }. A post is { id, type, title, date, status, meta, thumbnail }.
const WP_STORE = String.raw`
class WP_Post {
    public function __construct(public int $ID, public string $post_type = 'post', public string $post_title = '', public string $post_content = '', public string $post_date = '', public array $meta = [], public int $thumbnail = 0) {}
}
function __test_post(array $p, int $i): WP_Post {
    return new WP_Post((int) ($p['id'] ?? 100 + $i), $p['type'] ?? 'post', $p['title'] ?? '', $p['content'] ?? '', $p['date'] ?? '2026-01-01 00:00:00', $p['meta'] ?? [], (int) ($p['thumbnail'] ?? 0));
}
function post_type_exists($type) { return ! in_array($type, $GLOBALS['env']['missingTypes'] ?? [], true); }
function get_the_title($post) { return $post->post_title; }
function get_permalink($post) { return '/' . $post->post_type . '/' . $post->ID . '/'; }
function get_post_thumbnail_id($post) {
    $id = is_object($post) ? $post->ID : (int) $post;
    foreach ($GLOBALS['env']['posts'] ?? [] as $i => $p) {
        if ((int) ($p['id'] ?? 100 + $i) === $id) { return (int) ($p['thumbnail'] ?? 0); }
    }
    return 0;
}
function get_locale() { return 'en_US'; }
function get_post_meta($id, $key = '', $single = false) {
    $meta = null;
    foreach ($GLOBALS['env']['posts'] ?? [] as $i => $p) {
        if ((int) ($p['id'] ?? 100 + $i) === (int) $id) { $meta = $p['meta'] ?? []; break; }
    }
    if ($meta === null) {
        $attachment = $GLOBALS['env']['attachments'][(string) $id] ?? null;
        $meta = $attachment ? ['_wp_attachment_image_alt' => $attachment['alt'] ?? ''] : [];
    }
    if ($key === '') { return $single ? $meta : array_map(fn ($v) => [$v], $meta); }
    if (! array_key_exists($key, $meta)) { return $single ? '' : []; }
    return $single ? $meta[$key] : [$meta[$key]];
}
function get_post() {
    $current = $GLOBALS['env']['currentPost'] ?? null;
    return $current ? new WP_Post((int) ($current['id'] ?? 1), 'page', '', $current['content'] ?? '') : null;
}
function wp_get_attachment_url($id) { return $GLOBALS['env']['attachments'][(string) $id]['url'] ?? false; }
function wp_get_attachment_metadata($id) {
    $a = $GLOBALS['env']['attachments'][(string) $id] ?? null;
    return $a ? ['width' => $a['width'] ?? 0, 'height' => $a['height'] ?? 0] : false;
}
function wp_unslash($v) { return is_array($v) ? array_map('wp_unslash', $v) : stripslashes((string) $v); }
function __test_url_with(array $q) { return $q ? '/?' . http_build_query($q) : '/'; }
function add_query_arg($key, $value) { return __test_url_with([$key => $value] + $_GET); }
function remove_query_arg($key) { $q = $_GET; unset($q[$key]); return __test_url_with($q); }

// Real parse_blocks handles far more. This reads block comment delimiters,
// their JSON attributes and nesting, which is all a content-type query needs.
function parse_blocks($content) {
    $root = ['innerBlocks' => []];
    $stack = [&$root];
    preg_match_all('/<!--\s+(\/?)wp:([a-z0-9\/-]+)\s*(\{.*?\})?\s*(\/?)-->/s', (string) $content, $tokens, PREG_SET_ORDER);
    foreach ($tokens as $t) {
        if ($t[1] === '/') { array_pop($stack); continue; }
        $block = ['blockName' => str_contains($t[2], '/') ? $t[2] : 'core/' . $t[2], 'attrs' => $t[3] !== '' ? json_decode($t[3], true) : [], 'innerBlocks' => []];
        $top = &$stack[count($stack) - 1];
        $top['innerBlocks'][] = $block;
        if ($t[4] !== '/') { $stack[] = &$top['innerBlocks'][count($top['innerBlocks']) - 1]; }
        unset($top);
    }
    return $root['innerBlocks'];
}

class WP_Query {
    public array $posts = [];

    public function __construct(array $args) {
        $env = $GLOBALS['env'];
        $posts = [];
        foreach ($env['posts'] ?? [] as $i => $p) {
            $post = __test_post($p, $i);
            if ($post->post_type !== ($args['post_type'] ?? 'post')) { continue; }
            if (($p['status'] ?? 'publish') !== ($args['post_status'] ?? 'publish')) { continue; }
            if (isset($args['post__in']) && ! in_array($post->ID, $args['post__in'], true)) { continue; }
            if (in_array($post->ID, $args['post__not_in'] ?? [], true)) { continue; }
            if (isset($args['meta_query']) && ! $this->matches($args['meta_query'], $post->meta)) { continue; }
            $posts[] = $post;
        }
        if ($env['reverseTies'] ?? false) { $posts = array_reverse($posts); }

        $orderby = $args['orderby'] ?? ['date' => 'DESC'];
        if ($orderby === 'post__in') {
            $position = array_flip($args['post__in'] ?? []);
            usort($posts, fn ($a, $b) => $position[$a->ID] <=> $position[$b->ID]);
        } else {
            $orderby = is_array($orderby) ? $orderby : [$orderby => $args['order'] ?? 'DESC'];
            usort($posts, function ($a, $b) use ($orderby) {
                foreach ($orderby as $field => $dir) {
                    $cmp = $field === 'title' ? strcasecmp($a->post_title, $b->post_title) : strcmp($a->post_date, $b->post_date);
                    if ($cmp !== 0) { return strtoupper($dir) === 'DESC' ? -$cmp : $cmp; }
                }
                return 0;
            });
        }
        $limit = (int) ($args['posts_per_page'] ?? 10);
        $this->posts = $limit > 0 ? array_slice($posts, 0, $limit) : $posts;
    }

    private function matches(array $query, array $meta): bool {
        $or = ($query['relation'] ?? 'AND') === 'OR';
        foreach (array_filter($query, 'is_array') as $clause) {
            $has = array_key_exists($clause['key'], $meta);
            $hit = match ($clause['compare'] ?? '=') {
                'NOT EXISTS' => ! $has,
                '!=' => $has && (string) $meta[$clause['key']] !== (string) $clause['value'],
                default => $has && (string) $meta[$clause['key']] === (string) $clause['value'],
            };
            if ($or === $hit) { return $hit; }
        }
        return ! $or;
    }
}
`;

// modes: block (run block.php on attributes), view (render a Blade view on
// vars), call (run one function or Class::method on JSON args, print its
// JSON result)
const RENDER =
  String.raw`<?php
// PHP CLI's default display_errors target is stdout, which would otherwise
// land a warning ahead of the JSON callPhp expects there.
ini_set('display_errors', 'stderr');

[, $theme, $autoload, $resources, $mode, $block, $payload, $envJson] = $argv;
$payload = json_decode($payload, true);
$GLOBALS['env'] = json_decode($envJson, true);
$_GET = $GLOBALS['env']['query'] ?? [];

// Before the autoload require: a Composer package with a WordPress-style
// "if (!defined('ABSPATH')) exit;" guard in its own eagerly-autoloaded
// files would otherwise abort here.
define('ABSPATH', $theme . '/');

require $autoload;

` +
  WP_ESCAPING +
  WP_STORE +
  String.raw`
function __($v, $domain = null) { return $v; }
function get_bloginfo($field) { return $GLOBALS['env']['blogName'] ?? 'Test Site'; }
function wp_unique_id($prefix = '') { return $prefix . '1'; }
function wp_get_attachment_image_src($id, $size) { return ['/uploads/mobile-' . (int) $id . '.jpg', 640, 900]; }
function wp_get_attachment_image_srcset($id, $size) { return '/uploads/mobile-' . (int) $id . '.jpg 640w'; }
function wp_get_attachment_image($id, $size = 'thumbnail', $icon = false, $attrs = []) {
    $rendered = '';
    foreach ($attrs as $key => $value) {
        $rendered .= ' ' . $key . '="' . esc_attr($value) . '"';
    }
    return '<img src="/uploads/attachment-' . (int) $id . '.jpg"' . $rendered . '>';
}

// Any WordPress function this harness doesn't fake above. Each entry is a
// complete "function name(...) { ... }" definition, evaluated once.
foreach ($GLOBALS['env']['functions'] ?? [] as $definition) {
    eval($definition);
}

class TestLoopEnv {
    private array $stack = [];
    public function addLoop($data): void { $this->stack[] = (object) ['index' => -1]; }
    public function incrementLoopIndices(): void { end($this->stack)->index++; }
    public function getLastLoop() { return end($this->stack) ?: null; }
    public function popLoop(): void { array_pop($this->stack); }
    public function make($view, $data = []) { unset($data['__env']); return view($view, $data); }
}

$compiler = new Illuminate\View\Compilers\BladeCompiler(new Illuminate\Filesystem\Filesystem, sys_get_temp_dir());

// A caller registers whatever directives its own Blade views need with
// registerDirective(); this harness ships none of its own. $e is the literal
// placeholder registerDirective's caller wrote, substituted with the
// expression Blade parsed out of the directive's parentheses. Matched with a
// word boundary (not a plain str_replace) so a body that also contains
// "$env" or "$escape" isn't corrupted by a substring match on "$e".
foreach ($GLOBALS['env']['directives'] ?? [] as $directive) {
    $compiler->directive($directive['name'], fn ($e) => '<?php echo ' . preg_replace_callback('/\$e\b/', fn () => $e, $directive['body']) . '; ?>');
}

function view(string $name, array $payload = []) {
    global $compiler, $resources;
    $path = $resources . '/views/' . str_replace('.', '/', $name) . '.blade.php';
    $php = $compiler->compileString(file_get_contents($path));

    return new class($php, $payload) {
        public function __construct(private string $php, private array $payload) {}
        public function render(): string {
            extract($this->payload);
            $__env = new TestLoopEnv();
            ob_start();
            eval('?>' . $this->php);
            return ob_get_clean();
        }
    };
}

if ($mode === 'call') {
    // { "__post": {...} } stands for a WP_Post, which JSON cannot carry.
    $payload = array_map(fn ($a) => is_array($a) && isset($a['__post']) ? __test_post($a['__post'], 0) : $a, $payload);
    echo json_encode(call_user_func_array($block, $payload));
} elseif ($mode === 'view') {
    echo view('blocks.' . $block, $payload)->render();
} else {
    $attributes = $payload;
    ob_start();
    require $resources . '/blocks/' . $block . '/block.php';
    echo ob_get_clean();
}
`;

let workspace;

// Created on first use, not on import, and removed when this process exits
// — a `mkdtemp` workspace made eagerly at every module load leaked one
// `render-harness-*` folder per test run with nothing to clean it up.
function mktempWorkspace() {
  if (workspace) return workspace;
  workspace = mkdtempSync(resolve(tmpdir(), 'render-harness-'));
  writeFileSync(resolve(workspace, 'render.php'), RENDER);
  process.on('exit', () => rmSync(workspace, { recursive: true, force: true }));
  return workspace;
}

// <themeRoot>/vendor/autoload.php, else $KIT_AUTOLOAD, else the kit root's
// own vendor (so the harness runs before a real project has its own
// Composer install, and while testing the kit itself).
export function resolveAutoload(root = themeRoot) {
  const own = resolve(root, 'vendor/autoload.php');
  if (existsSync(own)) return own;

  if (process.env.KIT_AUTOLOAD && existsSync(process.env.KIT_AUTOLOAD)) {
    return process.env.KIT_AUTOLOAD;
  }

  const kitRoot = resolve(root, '..', 'vendor/autoload.php');
  if (existsSync(kitRoot)) return kitRoot;

  throw new Error(
    `No Composer autoload found. Looked in ${own}, $KIT_AUTOLOAD, and ${kitRoot}. Run "composer install" in the theme (or the kit root, when testing the kit itself).`,
  );
}

let directives = [];

// Registers a Blade directive every renderBlock/renderView call includes.
// `body` is a PHP expression containing the literal text `$e`, which is
// replaced with the expression Blade parsed out of the directive's
// parentheses, e.g. registerDirective('shout', 'strtoupper($e)').
export function registerDirective(name, body) {
  directives.push({ name, body });
}

export function clearDirectives() {
  directives = [];
}

const run = (mode, block, payload, env = {}, root = themeRoot) =>
  execFileSync(
    'php',
    [
      resolve(mktempWorkspace(), 'render.php'),
      root,
      resolveAutoload(root),
      env.root ?? resolve(root, 'resources'),
      mode,
      block,
      JSON.stringify(payload),
      JSON.stringify({ ...env, directives }),
    ],
    // quiet: keep a PHP fatal out of the parent's stderr; the thrown error
    // carries it in its message either way.
    { encoding: 'utf8', ...(env.quiet ? { stdio: ['ignore', 'pipe', 'pipe'] } : {}) },
  );

// The block as WordPress renders it: block.php, then its Blade view. `posts`
// are the fixture posts a content-type query reads (see post()); `env` adds
// attachments, currentPost, query (the $_GET) and the other fixture switches
// documented above. `env.root` points block.php lookups at a fixture folder
// instead of the theme's own resources/.
export const renderBlock = (block, attributes = {}, posts = [], env = {}) =>
  run('block', block, attributes, { ...env, posts });

// The block's Blade view alone, with `vars` as the view's variables.
export const renderView = (block, vars, env = {}) => run('view', block, vars, env);

// Runs one theme or harness function, or a static method such as
// 'App\\Example::method', on `args` and returns its result as JSON.
// An argument `{ __post: { id, type, content } }` reaches PHP as a WP_Post.
export const callPhp = (name, args = [], env = {}) =>
  JSON.parse(run('call', name, args, env));

let nextId = 1000;

// A fixture post as WordPress stores it. `over` merges into (and can
// override) `id`, `title`, `meta` and every other WP_Post field.
export const post = (type, title, over = {}) => ({
  id: nextId++,
  type,
  title,
  meta: {},
  ...over,
});

// The opening tag of the first element whose class list contains `className`
// exactly (as a whole class, not a hyphenated neighbour: `hero` never
// matches `home-hero`).
export function openingTag(html, className) {
  const tags = html.match(/<[a-z0-9]+[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const classAttr = tag.match(/\sclass="([^"]*)"/);
    if (classAttr && classAttr[1].split(/\s+/).includes(className)) {
      return tag;
    }
  }
  return null;
}
