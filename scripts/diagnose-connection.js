#!/usr/bin/env node

/**
 * Chrome 扩展连接诊断脚本
 * 用于检查扩展的构建状态和配置
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Chrome 扩展连接诊断工具\n');

// 检查构建目录
function checkBuildDirectory() {
  console.log('📁 检查构建目录...');
  
  const distPath = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distPath)) {
    console.log('❌ dist 目录不存在，请先运行 pnpm run build');
    return false;
  }
  
  console.log('✅ dist 目录存在');
  
  // 检查关键文件
  const requiredFiles = [
    'manifest.json',
    'index.html',
    'src/background/background.js',
    'src/content/contentShadcn.js',
    'src/popup/popup.js'
  ];
  
  let allFilesExist = true;
  requiredFiles.forEach(file => {
    const filePath = path.join(distPath, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} 存在`);
    } else {
      console.log(`❌ ${file} 缺失`);
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

// 检查 manifest.json
function checkManifest() {
  console.log('\n📋 检查 manifest.json...');
  
  const manifestPath = path.join(__dirname, '..', 'dist', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log('❌ manifest.json 不存在');
    return false;
  }
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // 检查必要字段
    const requiredFields = ['manifest_version', 'name', 'version', 'permissions', 'content_scripts', 'background'];
    requiredFields.forEach(field => {
      if (manifest[field]) {
        console.log(`✅ ${field}: ${JSON.stringify(manifest[field])}`);
      } else {
        console.log(`❌ ${field} 缺失`);
      }
    });
    
    // 检查权限
    const requiredPermissions = ['storage', 'activeTab', 'tabs'];
    const missingPermissions = requiredPermissions.filter(perm => !manifest.permissions.includes(perm));
    if (missingPermissions.length === 0) {
      console.log('✅ 所有必要权限都已配置');
    } else {
      console.log(`❌ 缺少权限: ${missingPermissions.join(', ')}`);
    }
    
    // 检查内容脚本配置
    if (manifest.content_scripts && manifest.content_scripts.length > 0) {
      const contentScript = manifest.content_scripts[0];
      console.log(`✅ 内容脚本配置: ${contentScript.js.join(', ')}`);
      console.log(`✅ 匹配模式: ${contentScript.matches.join(', ')}`);
    } else {
      console.log('❌ 内容脚本配置缺失');
    }
    
    return true;
  } catch (error) {
    console.log(`❌ 解析 manifest.json 失败: ${error.message}`);
    return false;
  }
}

// 检查文件大小
function checkFileSizes() {
  console.log('\n📊 检查文件大小...');
  
  const distPath = path.join(__dirname, '..', 'dist');
  const filesToCheck = [
    'src/background/background.js',
    'src/content/contentShadcn.js',
    'src/popup/popup.js',
    'assets/popup.css'
  ];
  
  filesToCheck.forEach(file => {
    const filePath = path.join(distPath, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`📄 ${file}: ${sizeKB} KB`);
      
      // 检查文件是否过大
      if (stats.size > 1024 * 1024) { // 1MB
        console.log(`⚠️  ${file} 文件较大，可能影响加载速度`);
      }
    } else {
      console.log(`❌ ${file} 不存在`);
    }
  });
}

// 检查常见问题
function checkCommonIssues() {
  console.log('\n🔍 检查常见问题...');
  
  const issues = [];
  
  // 检查是否有语法错误
  const jsFiles = [
    'dist/src/background/background.js',
    'dist/src/content/contentShadcn.js',
    'dist/src/popup/popup.js'
  ];
  
  jsFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        // 简单的语法检查
        if (content.includes('undefined') && content.includes('is not defined')) {
          issues.push(`${file} 可能包含未定义的变量`);
        }
      } catch (error) {
        issues.push(`${file} 读取失败: ${error.message}`);
      }
    }
  });
  
  if (issues.length === 0) {
    console.log('✅ 未发现明显问题');
  } else {
    console.log('⚠️ 发现以下潜在问题:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }
}

// 生成修复建议
function generateRecommendations() {
  console.log('\n💡 修复建议:');
  console.log('1. 如果构建文件缺失，运行: pnpm run build');
  console.log('2. 如果权限不足，检查 manifest.json 中的 permissions 字段');
  console.log('3. 如果内容脚本未加载，刷新目标页面');
  console.log('4. 如果消息通信失败，检查消息类型是否匹配');
  console.log('5. 在 Chrome 扩展管理页面重新加载扩展');
  console.log('6. 使用 test-connection.html 进行详细测试');
}

// 主函数
function main() {
  const buildOk = checkBuildDirectory();
  const manifestOk = checkManifest();
  
  if (buildOk) {
    checkFileSizes();
    checkCommonIssues();
  }
  
  generateRecommendations();
  
  console.log('\n🎯 诊断完成！');
  if (buildOk && manifestOk) {
    console.log('✅ 扩展配置看起来正常，如果仍有连接问题，请使用 test-connection.html 进行详细测试');
  } else {
    console.log('❌ 发现配置问题，请按照建议进行修复');
  }
}

// 运行诊断
main(); 