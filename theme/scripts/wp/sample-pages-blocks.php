<?php

/**
 * Scans a blocks directory for each block folder's block.json and groups
 * their example markup by `category`. Pure PHP, no WordPress and no
 * dependency on any specific block — testable standalone against a fixture
 * directory.
 *
 * Usage: php sample-pages-blocks.php <blocks-dir>
 *
 * Output: one NUL-terminated record per category, fields separated by
 * \x1f (unit separator):
 *   <page-slug>\x1f<page-title>\x1f<base64 block markup>
 */

if ($argc < 2) {
    fwrite(STDERR, "usage: php sample-pages-blocks.php <blocks-dir>\n");
    exit(1);
}

$blocksDir = rtrim($argv[1], '/');
$files = glob("$blocksDir/*/block.json") ?: [];
sort($files);

$groups = [];

foreach ($files as $file) {
    $block = json_decode(file_get_contents($file), true);
    if (! is_array($block) || empty($block['name'])) {
        continue;
    }

    $category = $block['category'] ?? 'uncategorized';
    $attributes = $block['example']['attributes'] ?? [];
    // isPreview only turns on the inserter's static preview image; saved as
    // real page content it forces the block to render as preview.svg.
    unset($attributes['isPreview']);
    $markup = sprintf(
        '<!-- wp:%s %s /-->',
        $block['name'],
        // Cast to object so an empty attribute set serializes as the "{}"
        // Gutenberg itself writes, never "[]".
        json_encode((object) $attributes, JSON_UNESCAPED_SLASHES)
    );

    $groups[$category][] = $markup;
}

ksort($groups);

foreach ($groups as $category => $blocks) {
    $title = 'Kit sample: '.ucwords(str_replace(['-', '_'], ' ', $category));
    $slug = 'kit-sample-'.trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($category)), '-');
    $markup = implode("\n\n", $blocks);

    echo implode("\x1f", [$slug, $title, base64_encode($markup)])."\0";
}
