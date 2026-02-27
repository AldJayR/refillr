import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.integration.test.ts'],
    exclude: ['node_modules', 'dist', '.git'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run integration test files sequentially (they share a DB)
    fileParallelism: false,
    // Set env vars before any test modules are imported
    setupFiles: ['src/__tests__/integration/helpers/setup-env.ts'],
  },
})
