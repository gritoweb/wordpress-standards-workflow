<?php
// Fixture for render-harness.test.mjs. Deliberately nests a hyphenated class
// ("home-fixture-block") around the block's real root class ("fixture-block")
// so openingTag() can prove it matches the exact class, not a neighbour.

$heading = $attributes['heading'] ?? 'Fixture';
?>
<div class="home-fixture-block">
    <div class="fixture-block">
        <h2><?php echo esc_html($heading); ?></h2>
        <?php echo view('blocks.fixture-block', ['body' => $attributes['body'] ?? ''])->render(); ?>
    </div>
</div>
