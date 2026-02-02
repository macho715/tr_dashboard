import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/__tests__/**/*.test.ts',
      'lib/**/__tests__/**/*.test.ts',
      'components/detail/__tests__/**/*.test.{ts,tsx}',
      'components/dashboard/__tests__/**/*.test.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: [
      { find: '@/lib/ssot', replacement: path.resolve(__dirname, './lib/ssot') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
});
