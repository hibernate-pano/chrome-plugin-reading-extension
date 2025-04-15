import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: 'dist/workers',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        extractorWorker: resolve(__dirname, 'src/workers/extractorWorker.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
});
