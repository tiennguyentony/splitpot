import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Same as CI, so snapshots of dates don't depend on the laptop.
    env: { TZ: 'UTC' },
  },
});
