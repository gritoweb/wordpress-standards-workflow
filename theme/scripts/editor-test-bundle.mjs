import { build } from 'vite';

// Bundles a block.jsx with Vite and runs it in Node. `modules` maps a module id
// (for example '@wordpress/blocks') to the source that replaces it. `aliases`
// maps a file-name suffix to the id of a module that replaces every import
// ending in it, so a suite can stub a shared component. `name` is the global the
// IIFE assigns, and the bundle's value is returned.
export async function executeBundle(entry, modules, name, aliases = {}) {
  const stubs = new Map(modules);
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    plugins: [
      {
        name: 'editor-test-modules',
        enforce: 'pre',
        resolveId(id) {
          if (stubs.has(id)) {
            return `\0${id}`;
          }

          if (id === entry) {
            return null;
          }

          for (const [suffix, alias] of Object.entries(aliases)) {
            if (id.endsWith(suffix)) {
              return `\0${alias}`;
            }
          }

          return null;
        },
        load(id) {
          return id.startsWith('\0') ? stubs.get(id.slice(1)) : null;
        },
      },
    ],
    // Sage compiles JSX without a React import in scope; the classic transform here needs one.
    esbuild: { jsxInject: "import React from 'react'" },
    build: {
      write: false,
      // Keeps component names readable, so a test can find a component by name.
      minify: false,
      target: 'node20',
      lib: { entry, formats: ['iife'], name },
    },
  });
  const outputs = Array.isArray(result)
    ? result.flatMap((item) => item.output)
    : result.output;
  const chunk = outputs.find((item) => item.type === 'chunk');

  return new Function(
    `${chunk.code}; return typeof ${name} === 'undefined' ? undefined : ${name};`,
  )();
}
