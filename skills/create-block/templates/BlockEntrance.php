<?php

namespace App\Blocks;

/**
 * Resolves entrance-animation attributes into data-attributes and classes
 * for the front end. Registered as a global attribute via BlockManager,
 * similar to BlockPadding / BlockImagePosition.
 *
 * When all entrance fields are empty/null the block inherits the site-wide
 * defaults from Site Settings (Customizer / Settings API).
 */
class BlockEntrance
{
    private const ALLOWED_TYPES = ['fade', 'slide', 'zoom', 'flip', 'blur'];
    private const ALLOWED_TRIGGERS = ['scroll', 'load'];
    private const ALLOWED_DIRECTIONS = ['up', 'down', 'left', 'right'];

    /**
     * Build the data-attributes string for the section wrapper.
     *
     * @param array $entrance The entrance attribute object from the block.
     * @return string HTML attribute string (empty if no animation configured).
     */
    public static function resolve(array $entrance): string
    {
        $type = sanitize_text_field($entrance['type'] ?? '');
        if ($type === '' || ! in_array($type, self::ALLOWED_TYPES, true)) {
            return '';
        }

        $attrs = ['data-entrance-type="' . esc_attr($type) . '"'];

        $trigger = sanitize_text_field($entrance['trigger'] ?? 'scroll');
        if (in_array($trigger, self::ALLOWED_TRIGGERS, true)) {
            $attrs[] = 'data-entrance-trigger="' . esc_attr($trigger) . '"';
        }

        $direction = sanitize_text_field($entrance['direction'] ?? '');
        if ($direction !== '' && in_array($direction, self::ALLOWED_DIRECTIONS, true)) {
            $attrs[] = 'data-entrance-direction="' . esc_attr($direction) . '"';
        }

        $duration = $entrance['duration'] ?? null;
        if ($duration !== null && is_numeric($duration)) {
            $attrs[] = 'data-entrance-duration="' . esc_attr((string) $duration) . '"';
        }

        $delay = $entrance['delay'] ?? null;
        if ($delay !== null && is_numeric($delay)) {
            $attrs[] = 'data-entrance-delay="' . esc_attr((string) $delay) . '"';
        }

        $stagger = $entrance['stagger'] ?? null;
        if ($stagger !== null && is_numeric($stagger)) {
            $attrs[] = 'data-entrance-stagger="' . esc_attr((string) $stagger) . '"';
        }

        return implode(' ', $attrs);
    }
}
