<?php

namespace App\Blocks;

class BlockManager
{
    /**
     * Folders under resources/blocks/ (each must contain a block.json).
     */
    protected array $blocks = [
        // Add slugs here as blocks are scaffolded.
    ];

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
            // Null numbers inherit the site's motion defaults (BlockMotion).
            'entrance'           => [
                'type'    => 'object',
                'default' => [
                    'type'      => 'fade-slide',
                    'direction' => 'up',
                    'unit'      => 'px',
                    'trigger'   => 'section',
                    'distance'  => null,
                    'duration'  => null,
                    'delay'     => null,
                    'stagger'   => null,
                ],
            ],
        ];
    }

    public function register(): void
    {
        foreach ($this->blocks as $blockName) {
            $this->registerSingleBlock($blockName);
        }
    }

    protected function registerSingleBlock(string $blockName): void
    {
        $blockPath = get_template_directory() . "/resources/blocks/{$blockName}";
        $blockJson = "{$blockPath}/block.json";

        if (!is_dir($blockPath) || !file_exists($blockJson)) {
            return;
        }

        $metadata   = json_decode(file_get_contents($blockJson), true);
        $blockAttrs = $metadata['attributes'] ?? [];

        $mergedAttributes = array_merge($this->globalAttributes(), $blockAttrs);

        register_block_type($blockPath, ['attributes' => $mergedAttributes]);
    }

    public function addBlock(string $blockName): void
    {
        if (!in_array($blockName, $this->blocks, true)) {
            $this->blocks[] = $blockName;
        }
    }

    public function getBlocks(): array
    {
        return $this->blocks;
    }

    public function getNamespace(): string
    {
        return $this->namespace;
    }
}
