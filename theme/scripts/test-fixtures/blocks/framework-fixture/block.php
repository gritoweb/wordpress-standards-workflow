<?php
// Fixture for the framework's end-to-end test (render half). Exercises every
// piece this branch owns in one block: BlockPadding, BlockEntrance,
// BlockAttributes (grounds, cta, divider), and the @paddingClasses/@entrance/
// @entrancePart directives (registered by the calling test, the same list
// BlockDirectivesServiceProvider::directives() exports).

use App\Blocks\BlockAttributes;
use App\Blocks\BlockEntrance;
use App\Blocks\BlockPadding;

$attributes = $attributes ?? [];

echo view('blocks.framework-fixture', [
    'anchor' => sanitize_html_class($attributes['anchor'] ?? ''),
    'heading' => sanitize_text_field($attributes['heading'] ?? ''),
    'groundClass' => BlockAttributes::groundClass($attributes['ground'] ?? ''),
    'entrance' => BlockEntrance::fromBlock($attributes, __DIR__),
    'items' => is_array($attributes['items'] ?? null) ? $attributes['items'] : [],
    ...BlockAttributes::cta($attributes),
    'sectionDivider' => BlockAttributes::divider($attributes),
    ...BlockPadding::fromAttributes($attributes),
])->render();
