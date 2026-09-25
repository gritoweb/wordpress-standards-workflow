<?php

namespace App\Providers;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

/**
 * Registers the block framework's Blade directives. Kept out of Sage's own
 * ThemeServiceProvider so a Sage update to that stock file never has to route
 * around kit code. Add this class to functions.php's
 * `Application::configure()->withProviders([...])` list
 * during project setup instead of editing ThemeServiceProvider::boot().
 */
class BlockDirectivesServiceProvider extends ServiceProvider
{
    /**
     * name => PHP expression using $e for the directive's parsed argument.
     * Exported so the render-harness tests register the exact directives
     * boot() wires, instead of a second hard-coded copy that can drift.
     */
    public static function directives(): array
    {
        return [
            'paddingClasses' => '\App\Blocks\BlockPadding::resolve($e)',
            // On a section root: <section @entrance($entrance)>. It prints its
            // own style attribute, so the element must not carry another one
            // (pass a second argument for extra style: @entrance($entrance, $extra)).
            'entrance' => '\App\Blocks\BlockEntrance::root($e)',
            // On a part: <h2 @entrancePart($loop->index)>. Omit the index for 0.
            'entrancePart' => '\App\Blocks\BlockEntrance::part($e)',
        ];
    }

    public function boot(): void
    {
        // Every value these directives echo is a whitelisted literal or a
        // clamped integer, except @entrance's own optional $extraStyle
        // argument, which is caller text — BlockEntrance::root() escapes it
        // with esc_attr() itself before it reaches the style attribute.
        foreach (self::directives() as $name => $body) {
            Blade::directive($name, fn (string $e) => '<?php echo '.str_replace('$e', $e, $body).'; ?>');
        }
    }
}
