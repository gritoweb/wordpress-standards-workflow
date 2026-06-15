// Sage 11 theme — Prettier config. Copy to the theme root as `prettier.config.js`.
//
// Sorts Tailwind classes into the canonical order in BOTH Blade markup and CSS
// `@apply` bodies.
//
// IMPORTANT: prettier-plugin-tailwindcss does NOT wrap @shufo's custom `blade`
// parser, so it canNOT sort classes inside .blade.php on its own. For Blade we
// enable the Blade plugin's own `sortTailwindcssClasses` option. The tailwindcss
// plugin (listed last) still handles every non-Blade file (CSS `@apply`, JS/JSX).
//
// Note (Tailwind v4): @shufo ships its own built-in sorter and orders the
// standard utilities correctly with no JS config. It does NOT auto-read custom
// utilities generated via `@theme {}` (v4 CSS-first) — the option's
// `tailwindcssConfigPath` points at a JS config (v3 model) and doesn't apply to
// v4. In practice the standard utilities sort fine; only the relative placement
// of 100%-custom tokens may not be theme-aware.
//
// Install (theme root, on the host — not inside Lando):
//   npm i -D prettier prettier-plugin-tailwindcss @shufo/prettier-plugin-blade lint-staged
export default {
  plugins: [
    '@shufo/prettier-plugin-blade',
    'prettier-plugin-tailwindcss', // MUST stay last (for the non-Blade files)
  ],
  overrides: [
    {
      files: ['*.blade.php'],
      options: {
        parser: 'blade',
        sortTailwindcssClasses: true, // <-- this is what sorts classes in Blade
      },
    },
  ],
};
