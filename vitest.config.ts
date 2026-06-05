import { defineConfig } from 'vitest/config'

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
    },
  },
})
