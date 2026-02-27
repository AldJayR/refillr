# 🐛 vite preview fails with multiple SSR runtime errors

## Summary

Production preview (`vite build && vite preview`) crashes with a chain of SSR errors. Three have been fixed in branch `fix/ssr-preview-build-errors`, but one remains unresolved: `Reflect.getMetadata is not a function` caused by Typegoose/decorator metadata in the Nitro SSR bundle.

`vite dev` works fine — all errors are specific to the production SSR build produced by Nitro.

---

## Environment

- **Vite:** 7.1.7 (with Environment API)
- **Nitro:** 3.0.1-nightly (via nitro/vite plugin)
- **TanStack Start:** 1.132.0
- **@vitejs/plugin-react:** 5.0.4
- **@typegoose/typegoose:** 13.1.0
- **Node.js:** 24.14.0

---

## Errors (in order of appearance)

### ✅ Fixed: jsxDevRuntimeExports.jsxDEV is not a function

**Root cause:** In production builds, `@vitejs/plugin-react` v5 skips Babel and defers JSX to esbuild. Vite 7's esbuild uses `jsxDev: !environment.config.isProduction` per-environment. The SSR environment resolved `isProduction` as false, generating `jsxDEV()` calls. Combined with `ssr.noExternal` bundling react/jsx-dev-runtime (whose production entry sets `jsxDEV = void 0`), this caused the crash.

**Fix:** Added `esbuild: { jsxDev: false }` to `vite.config.ts`.

---

### ✅ Fixed: Cannot read properties of null (reading 'useState')

**Root cause:** `ssr.noExternal: ['react', 'react-dom']` forced React to be bundled inline in the SSR chunk, creating a second copy alongside Nitro's `_libs/react.mjs`. `react-dom` initialized hooks on the `_libs` copy, but app code used the inline copy where `ReactSharedInternals.H` was null.

**Fix:** Removed `react` and `react-dom` from `ssr.noExternal`.

---

### ✅ Fixed: Module "mongodb/package.json" needs import attribute of "type: json"

**Root cause:** Nitro's Rollup build has no JSON plugin. When mongodb/mongoose's CJS `require('./package.json')` is converted to ESM, the .json imports are left as external without `with { type: "json" }`. Node.js 22+ enforces this attribute. `ssr.noExternal` didn't help because the final output is produced by Nitro's Rollup build (not Vite's SSR pass), and Nitro's `defu()` merge prevents adding top-level Rollup plugins.

**Fix:** Added a Rollup output plugin via `rollupConfig.output.plugins` (not blocked by defu) that uses `renderChunk` to post-process each chunk and add `with { type: "json" }` to all bare JSON imports.

---

### ❌ Unresolved: Reflect.getMetadata is not a function

**Root cause:** The project uses `@typegoose/typegoose` with TypeScript decorators (`@prop`, `@modelOptions`) across all `*.server.ts` model files. Typegoose requires the `reflect-metadata` polyfill to be imported before any decorator usage. In the SSR production bundle, this polyfill is either:

1. Not bundled/imported (tree-shaken or externalized)
2. Loaded after decorator evaluation
3. Not available because `emitDecoratorMetadata` output is stripped by esbuild (which doesn't support `emitDecoratorMetadata`)

**Affected files:**

- `src/models/User.server.ts`
- `src/models/Merchant.server.ts`
- `src/models/Order.server.ts`
- `src/models/Rider.server.ts`
- `src/models/DOEConfig.server.ts`

**Possible solutions (needs investigation):**

1. Add `import 'reflect-metadata'` to the server entry (e.g., `src/start.ts` or a Nitro server plugin) so it loads before model files
2. Switch from esbuild to SWC (`@vitejs/plugin-react-swc`) which supports `emitDecoratorMetadata`
3. Migrate away from Typegoose decorators to plain Mongoose schemas (eliminates the reflect-metadata dependency entirely)
4. Configure Nitro to inject reflect-metadata via `rollupConfig` inject plugin or a server middleware

---

## Current state of vite.config.ts (on branch)

```typescript
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  esbuild: {
    jsxDev: false,
  },
  optimizeDeps: {
    include: [
      '@clerk/tanstack-react-start',
      '@clerk/clerk-react',
      'cookie'
    ],
  },
  plugins: [
    devtools(),
    nitro({
      rollupConfig: {
        external: [/^@sentry\//],
        output: {
          plugins: [{
            name: 'fix-json-imports',
            renderChunk(code: string) {
              if (!code.includes('.json"')) return null
              return code
                .replace(
                  /import\s+([\w$]+)\s+from\s+"([^"]+\.json)"/g,
                  'import $1 from "$2" with { type: "json" }',
                )
                .replace(
                  /import\s+"([^"]+\.json)"/g,
                  'import "$1" with { type: "json" }',
                )
            },
          }],
        },
      },
    }),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
```

---

## Notes

- All errors only manifest in `vite preview` (production build). `vite dev` works correctly.
- The core issue is the interaction between Vite 7's Environment API, Nitro's Rollup build, and esbuild's limited decorator support — each layer has different assumptions about module format, production mode, and polyfill availability.
