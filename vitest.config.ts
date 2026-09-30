import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@shared': resolve(__dirname, './src/shared'),
      '@content': resolve(__dirname, './src/content'),
      '@background': resolve(__dirname, './src/background'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Vitest skips the CSS pipeline by default, which makes `?inline` imports
    // (host.css in the toast path) resolve to an empty string — the injection
    // tests would then assert against nothing and pass vacuously or fail on
    // content that is really there. Process CSS so inlined stylesheets carry
    // their actual text.
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/.gitkeep',
        // Type declarations only — no runtime code to execute, so reporting
        // 0% for it would be noise that drags the real numbers down.
        'src/shared/types.ts',
      ],
      thresholds: {
        // Coverage ratchet. These are NOT aspirational targets — they are set
        // just below the last measured value so the gate is real without
        // failing on a single newly-uncovered line:
        //
        //   measured 2026-09-29 (all files, after excluding types.ts):
        //   statements 97.04 · branches 92.65 · functions 97.13 · lines 98.27
        //
        // Rounded down to whole numbers, so each gate keeps only the sliver of
        // headroom the rounding leaves behind — never more.
        // Raise them as coverage grows — a threshold nobody bumps is a
        // threshold that silently rots. CI enforces these via
        // `pnpm run test:coverage`.
        statements: 97,
        branches: 92,
        functions: 97,
        lines: 98,
      },
    },
  },
});
