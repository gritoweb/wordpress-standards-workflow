<?php

namespace App\Content;

/**
 * The content types a collection block can show, registered from app/blocks.php:
 * ContentTypes::register(Posts::class). See docs/patterns/collection-grid.md.
 *
 * A collection block's editor keeps its own list of each type's slug and
 * label, because the editor never loads this PHP class. Add a type in both
 * places.
 */
class ContentTypes
{
    /** @var class-string<ContentType>[] */
    private static array $adapters = [];

    /**
     * @param class-string<ContentType> $class
     */
    public static function register(string $class): void
    {
        if (! in_array($class, self::$adapters, true)) {
            self::$adapters[] = $class;
        }
    }

    /**
     * @return class-string<ContentType>[]
     */
    public static function adapters(): array
    {
        return self::$adapters;
    }

    /**
     * @return class-string<ContentType>|null
     */
    public static function adapter(string $postType): ?string
    {
        foreach (self::$adapters as $class) {
            if ($class::postType() === $postType) {
                return $class;
            }
        }

        return null;
    }
}
