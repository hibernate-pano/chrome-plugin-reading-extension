import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src-new'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'tests/**/*.property.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src-new/**/*.ts', 'src-new/**/*.tsx'],
      exclude: ['src-new/**/*.d.ts', 'src-new/**/.gitkeep'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
});
