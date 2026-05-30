import { defineConfig } from 'vitest/config'

// Two distinct dummy master keys (32 bytes each) so rotation / multi-key read paths
// are exercised in tests. KEY_A is the current key, KEY_B the previous one.
const KEY_A = Buffer.alloc(32, 1).toString('base64')
const KEY_B = Buffer.alloc(32, 2).toString('base64')

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
      ENCRYPTION_KEY: KEY_A,
      ENCRYPTION_KEY_PREVIOUS: KEY_B,
    },
  },
})
