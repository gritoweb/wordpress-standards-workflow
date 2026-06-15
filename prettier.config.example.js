// Sage 11 theme — Prettier config. Copy to the theme root as `prettier.config.js`.
//
// Sorts Tailwind classes into the canonical order in BOTH Blade markup and CSS
// `@apply` bodies, so every dev writes them the same way without thinking about it.
//
// Install (in the theme root, on the host — not inside Lando):
//   npm i -D prettier prettier-plugin-tailwindcss @shufo/prettier-plugin-blade
//
// Order matters: `prettier-plugin-tailwindcss` MUST be listed last.
export default {
  plugins: [
    '@shufo/prettier-plugin-blade',
    'prettier-plugin-tailwindcss',
  ],
  overrides: [
    {
      files: ['*.blade.php'],
      options: { parser: 'blade' },
    },
  ],
};
