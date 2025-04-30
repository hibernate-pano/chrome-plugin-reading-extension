import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: 'dist/workers',
    emptyOutDir: true,
    // 禁用复制 public 目录中的文件
    publicDir: false,
    rollupOptions: {
      input: {
        extractorWorker: resolve(__dirname, 'src/workers/extractorWorker.ts'),
        contentPipelineWorker: resolve(__dirname, 'src/workers/contentPipelineWorker.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
});
