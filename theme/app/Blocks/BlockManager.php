<?php

namespace App\Blocks;

class BlockManager
{
    /**
     * Gutenberg block namespace — the prefix used in each block's `block.json`
     * `name` field (e.g., "acme/<slug>"). Not used internally by BlockManager;
     * exposed via getNamespace() so external tooling (the `create-block` skill)
     * knows what prefix to put in new block.json files.
     *
     * Not the same as:
     *   - PHP namespace `App\` (composer PSR-4 autoload, in composer.json)
     *   - Text domain (the `Text Domain` header in style.css, used by __() calls)
     */
    protected string $namespace = '__BLOCK_NAMESPACE__';

    protected function globalAttributes(): array
    {
        return [
            'paddingVertDesktop' => ['type' => 'number',  'default' => 112],
            'paddingVertMobile'  => ['type' => 'number',  'default' => 56],
            'paddingXDesktop'    => ['type' => 'boolean', 'default' => true],
            'paddingXMobile'     => ['type' => 'boolean', 'default' => true],
            // A null number means "use the Site Settings > Motion default".
            // A block that wants its own preset overrides these in its own
            // block.json; leaving them null here is what lets Site Settings
            // reach every block that doesn't.
            'entrance' => [
                'type'    => 'object',
                'default' => [
                    'type'      => 'fade-slide',
                    'direction' => 'up',
                    'distance'  => null,
                    'unit'      => 'px',
                    'duration'  => null,
                    'delay'     => null,
                    'stagger'   => null,
                    'trigger'   => 'section',
                ],
            ],
        ];
    }

    public function register(): void
    {
        add_filter('block_type_metadata', [$this, 'addGlobalAttributes']);
        add_filter('block_type_metadata', [$this, 'stampAssetVersion']);

        foreach (glob(get_template_directory().'/resources/blocks/*/block.json') as $blockJson) {
            register_block_type(dirname($blockJson));
        }
    }

    /**
     * Gives every theme block the shared attributes. A block's own declaration
     * wins when it redeclares one.
     */
    public function addGlobalAttributes(array $metadata): array
    {
        if (! $this->isThemeBlock($metadata)) {
            return $metadata;
        }

        $metadata['attributes'] = array_merge($this->globalAttributes(), $metadata['attributes'] ?? []);

        return $metadata;
    }

    protected function isThemeBlock(array $metadata): bool
    {
        // WordPress passes $metadata['file'] through realpath() before this
        // filter runs; a symlinked theme folder needs the same resolution
        // here, or every block in it looks like it came from outside
        // resources/blocks/.
        $themeDir = realpath(get_template_directory()) ?: get_template_directory();
        $root = wp_normalize_path($themeDir.'/resources/blocks/');

        return ! empty($metadata['file']) && str_starts_with(wp_normalize_path($metadata['file']), $root);
    }

    /**
     * A block's own block.css and block.js are served from source, and
     * WordPress versions them from block.json's `version` — falling back to the
     * WordPress version when it is absent. Every theme block would otherwise
     * share one cache key that only moves on a core update, so an edit to
     * block.js would reach nobody who already had the file. Stamping the
     * folder's newest mtime gives each block a key that moves when the block
     * does.
     */
    public function stampAssetVersion(array $metadata): array
    {
        // A plugin's block keeps whatever version its own author declared.
        if (! empty($metadata['version']) || ! $this->isThemeBlock($metadata)) {
            return $metadata;
        }

        $dir = dirname($metadata['file']);

        // GLOB_BRACE isn't defined on musl/Alpine PHP; Lando and Pantheon both
        // run Debian, so this is fine for the kit's supported hosts.
        $metadata['version'] = (string) max(array_map('filemtime', glob("{$dir}/block.{json,css,js}", GLOB_BRACE)));

        return $metadata;
    }

    public function getNamespace(): string
    {
        return $this->namespace;
    }
}
