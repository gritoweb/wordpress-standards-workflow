<?php

namespace App\Blocks;

class BlockPadding
{
    // All class strings are literals so Tailwind's scanner includes them at build time.
    private const PY_MOBILE  = [0 => 'py-0',    56 => 'py-14',    96 => 'py-24',    112 => 'py-28'];
    private const PY_DESKTOP = [0 => 'md:py-0', 56 => 'md:py-14', 112 => 'md:py-28', 218 => 'md:py-[13.625rem]'];
    private const PX_MOBILE  = [false => 'px-0',    true => 'px-5'];
    private const PX_DESKTOP = [false => 'lg:px-0', true => 'lg:px-[6rem]'];

    public static function resolve(
        int  $vertMobile,
        int  $vertDesktop,
        bool $horizMobile,
        bool $horizDesktop
    ): string {
        return implode(' ', [
            self::PY_MOBILE[$vertMobile]    ?? 'py-14',
            self::PY_DESKTOP[$vertDesktop]  ?? 'md:py-28',
            self::PX_MOBILE[$horizMobile]   ?? 'px-0',
            self::PX_DESKTOP[$horizDesktop] ?? 'md:px-0',
        ]);
    }
}
