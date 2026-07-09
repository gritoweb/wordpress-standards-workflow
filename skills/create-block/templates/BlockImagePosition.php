<?php

namespace App\Blocks;

class BlockImagePosition
{
    // All strings are literals so Tailwind's scanner includes them at build time.
    private const OBJECT_CLASSES = [
        'top-left'      => 'object-left-top',
        'top-center'    => 'object-top',
        'top-right'     => 'object-right-top',
        'middle-left'   => 'object-left',
        'center'        => 'object-center',
        'middle-right'  => 'object-right',
        'bottom-left'   => 'object-left-bottom',
        'bottom-center' => 'object-bottom',
        'bottom-right'  => 'object-right-bottom',
    ];

    private const CSS_VALUES = [
        'top-left'      => 'left top',
        'top-center'    => 'center top',
        'top-right'     => 'right top',
        'middle-left'   => 'left center',
        'center'        => 'center center',
        'middle-right'  => 'right center',
        'bottom-left'   => 'left bottom',
        'bottom-center' => 'center bottom',
        'bottom-right'  => 'right bottom',
    ];

    public static function objectClass(string $position): string
    {
        return self::OBJECT_CLASSES[$position] ?? 'object-center';
    }

    public static function cssValue(string $position): string
    {
        return self::CSS_VALUES[$position] ?? 'center center';
    }
}
