// A real Sage project autoloads App\* classes through its own project
// composer.json (PSR-4). This kit repo has no such project, only the dev
// composer.json that backs render-harness.mjs's Blade compiler, so tests
// register this tiny stand-in autoloader through render-harness's
// `env.functions` extension point instead of pasting class source into
// every test. `chr(92)` avoids writing a literal backslash into the PHP
// string this module hands to eval() by way of a JSON round trip.
export const APP_AUTOLOAD = `
spl_autoload_register(function ($class) use ($theme) {
    if (strpos($class, 'App') !== 0) {
        return;
    }
    // env.appRoots adds folders after the theme's own app/, so a suite for
    // code that lives outside the theme (the kit's examples) can autoload it.
    $relative = str_replace(chr(92), '/', substr($class, 3)) . '.php';
    foreach (array_merge([$theme . '/app'], $GLOBALS['env']['appRoots'] ?? []) as $root) {
        if (file_exists($root . $relative)) {
            require $root . $relative;
            return;
        }
    }
});
`;
