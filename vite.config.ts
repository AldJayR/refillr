import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react-swc'
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
        external: [
          /^@sentry\//,
          'kerberos',
          'snappy',
          '@mongodb-js/saslprep',
          'mongodb',
          'mongoose',
          '@typegoose/typegoose',
          'reflect-metadata'
        ],
        output: {
          banner: 'import "reflect-metadata";',
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
