import { defineConfig } from 'vitest/config'

// A dummy 32-byte master key for tests (env.ts requires a valid ENCRYPTION_KEY).
const KEY = Buffer.alloc(32, 1).toString('base64')

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts', 'src/**/*.test.ts', 'shared/**/*.test.ts'],
    // env.ts validates these at import time and exits if missing; supply test values.
    env: {
      NODE_ENV: 'test',
      // Vite injects BASE_URL='/' (its public base path); pin a valid URL so env.ts
      // validation passes under Vitest.
      BASE_URL: 'http://localhost:3000',
      SESSION_SECRET: 'test-session-secret-test-session-secret',
      ENCRYPTION_KEY: KEY,
    },
  },
})
