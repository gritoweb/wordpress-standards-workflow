import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const kitRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Renders a block as WordPress does: block.php, then its view through Laravel's
// real Blade compiler and view factory, so <x-button-link> and @props run too.
// App\\Blocks classes load from the kit's own templates.
//
// The fakes reject the schemes WordPress rejects, strip what kses strips and
// escape what esc_* escapes. They don't filter CSS beyond dropping parentheses,
// don't know every tag, and don't repair broken markup.
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


const RENDER = String.raw`<?php
ini_set('display_errors', 'stderr');
[, $kitRoot, $themeRoot, $block, $payload, $cache] = $argv;
define('ABSPATH', $themeRoot . '/');
require $kitRoot . '/vendor/autoload.php';

spl_autoload_register(function ($class) use ($kitRoot) {
    if (str_starts_with($class, 'App\\Blocks\\')) {
        require $kitRoot . '/skills/create-block/templates/' . substr($class, 11) . '.php';
    }
    if (str_starts_with($class, 'App\\Content\\')) {
        require $kitRoot . '/skills/create-block/templates/collection/app/Content/' . substr($class, 12) . '.php';
    }
});
` + WP_ESCAPING + String.raw`
function __($v, $domain = null) { return $v; }
function esc_html__($v, $domain = null) { return esc_html($v); }
function esc_attr__($v, $domain = null) { return esc_attr($v); }
function get_bloginfo($field = '') { return 'Test Site'; }
function wp_unslash($v) { return $v; }
function add_query_arg($key, $value) { return '/?' . $key . '=' . $value; }
function remove_query_arg($key) { return '/'; }
class WP_Post { public $post_date = '2026-01-01'; public function __construct(public $ID, public $post_title) {} }

// A fake adapter: the real one needs WP_Query.
class TestPosts implements App\Content\ContentType {
    public static function postType(): string { return 'post'; }
    public static function label(): string { return 'Posts'; }
    public static function selectedPosts(array $include, array $exclude, string $orderby): array {
        return array_map(fn ($n) => new WP_Post($n, json_decode($GLOBALS['argv'][4], true)['testTitle'] ?? "Post $n"), range(1, 3));
    }
    public static function card(WP_Post $post): array {
        return ['id' => $post->ID, 'title' => $post->post_title, 'meta' => '', 'excerpt' => $post->post_title, 'url' => json_decode($GLOBALS['argv'][4], true)['testUrl'] ?? '/post/', 'photoId' => $post->ID, 'photoAlt' => $post->post_title];
    }
}
App\Content\ContentTypes::register(TestPosts::class);

function wp_unique_id($prefix = '') { return $prefix . '1'; }
function wp_enqueue_script(...$args) {}
function wp_enqueue_style(...$args) {}
function get_theme_mod($key, $default = false) { return $default; }
function get_post_meta($id, $key = '', $single = false) { return ''; }
function wp_get_attachment_url($id) { return '/uploads/attachment-' . (int) $id . '.jpg'; }
function wp_get_attachment_image_url($id, $size = 'thumbnail') { return wp_get_attachment_url($id); }
function wp_get_attachment_image_src($id, $size = 'thumbnail') { return [wp_get_attachment_url($id), 640, 900]; }
function wp_get_attachment_image($id, $size = 'thumbnail', $icon = false, $attrs = []) {
    $rendered = '';
    foreach ($attrs as $key => $value) { $rendered .= ' ' . $key . '="' . esc_attr($value) . '"'; }
    return '<img src="' . wp_get_attachment_url($id) . '"' . $rendered . '>';
}

$container = new Illuminate\Container\Container;
Illuminate\Container\Container::setInstance($container);
$files = new Illuminate\Filesystem\Filesystem;
$compiler = new Illuminate\View\Compilers\BladeCompiler($files, $cache);
foreach ([
    'paddingClasses' => '\App\Blocks\BlockPadding::resolve',
    'entrance' => '\App\Blocks\BlockEntrance::root',
    'entrancePart' => '\App\Blocks\BlockEntrance::part',
] as $name => $method) {
    $compiler->directive($name, fn ($e) => "<?php echo $method($e); ?>");
}
$resolver = new Illuminate\View\Engines\EngineResolver;
$resolver->register('blade', fn () => new Illuminate\View\Engines\CompilerEngine($compiler, $files));
$finder = new Illuminate\View\FileViewFinder($files, [$themeRoot . '/resources/views']);
$factory = new Illuminate\View\Factory($resolver, $finder, new Illuminate\Events\Dispatcher($container));
$factory->setContainer($container);
$container->instance(Illuminate\Contracts\View\Factory::class, $factory);
$container->instance('view', $factory);
$container->instance('blade.compiler', $compiler);
// ComponentTagCompiler only asks the application for its namespace.
$container->instance(Illuminate\Contracts\Foundation\Application::class, new class { public function getNamespace() { return 'App\\'; } });

function view(string $name, array $data = []) { return $GLOBALS['factory']->make($name, $data); }

$attributes = json_decode($payload, true);
ob_start();
require $themeRoot . '/resources/blocks/' . $block . '/block.php';
echo ob_get_clean();
`;

let workspace;

function ensureWorkspace() {
  if (workspace) return workspace;
  workspace = mkdtempSync(resolve(tmpdir(), 'render-harness-'));
  writeFileSync(resolve(workspace, 'render.php'), RENDER);
  process.on('exit', () => rmSync(workspace, { recursive: true, force: true }));
  return workspace;
}

export const renderBlock = (themeRoot, block, attributes = {}) =>
  execFileSync(
    'php',
    [resolve(ensureWorkspace(), 'render.php'), kitRoot, themeRoot, block, JSON.stringify(attributes), ensureWorkspace()],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
