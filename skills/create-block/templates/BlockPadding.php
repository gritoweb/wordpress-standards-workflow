<?php

namespace App\Blocks;

class BlockPadding
{
    // All class strings are literals so Tailwind's scanner includes them at build time.
    private const PY_MOBILE  = [0 => 'py-0',    56 => 'py-14',    96 => 'py-24',    112 => 'py-28'];
    private const PY_DESKTOP = [0 => 'md:py-0', 56 => 'md:py-14', 112 => 'md:py-28', 218 => 'md:py-[13.625rem]'];
    private const PX_MOBILE  = [false => 'px-0',    true => 'px-5'];
    private const PX_DESKTOP = [false => 'lg:px-0', true => 'lg:px-[6rem]'];

    /**
     * Tailwind classes for the Spacing panel. Takes the block's $attributes
     * array, or the four values separately.
     */
    public static function resolve(
        int|array $vertMobile,
        ?int $vertDesktop = null,
        ?bool $horizMobile = null,
        ?bool $horizDesktop = null
    ): string {
        if (is_array($vertMobile)) {
            [$vertMobile, $vertDesktop, $horizMobile, $horizDesktop] = array_values(self::fromAttributes($vertMobile));
        }

        return implode(' ', [
            self::PY_MOBILE[$vertMobile]           ?? 'py-14',
            self::PY_DESKTOP[$vertDesktop ?? 112]  ?? 'md:py-28',
            self::PX_MOBILE[$horizMobile ?? true]  ?? 'px-5',
            self::PX_DESKTOP[$horizDesktop ?? true] ?? 'lg:px-[6rem]',
        ]);
    }

    /**
     * The four padding values, with the BlockManager defaults.
     *
     * @return array{paddingVertMobile: int, paddingVertDesktop: int, paddingXMobile: bool, paddingXDesktop: bool}
     */
    public static function fromAttributes(array $attributes): array
    {
        return [
            'paddingVertMobile'  => absint($attributes['paddingVertMobile'] ?? 56),
            'paddingVertDesktop' => absint($attributes['paddingVertDesktop'] ?? 112),
            'paddingXMobile'     => (bool) ($attributes['paddingXMobile'] ?? true),
            'paddingXDesktop'    => (bool) ($attributes['paddingXDesktop'] ?? true),
        ];
    }
}
