import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 要删除的文件列表
const filesToRemove = [
  'dist/workers/manifest.json',
  'dist/workers/icon16.png',
  'dist/workers/icon48.png',
  'dist/workers/icon128.png',
  'dist/workers/vite.svg'
];

// 删除文件
filesToRemove.forEach(filePath => {
  const fullPath = path.resolve(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log(`Deleted: ${filePath}`);
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

console.log('Cleanup completed.');
