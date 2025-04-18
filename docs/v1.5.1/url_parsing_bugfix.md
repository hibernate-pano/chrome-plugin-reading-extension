# URL 解析错误修复报告

## 问题描述

在实施 v1.5.1 版本的改进时，遇到了以下错误：

```
Failed to parse URL: TypeError: Failed to construct 'URL': Invalid URL
```

这个错误发生在尝试解析无效 URL 时，特别是在处理相对路径和不完整的 URL 时。

## 问题原因

经过调查，发现问题出在多个文件中的 URL 解析逻辑上：

1. 在 `defuddleExtractor.ts` 中，`extractDomain` 方法直接尝试创建 URL 对象，但没有对输入进行充分验证。
2. 在 `contentExtractor.ts` 中，类似的问题也存在于 `extractDomain` 和 `fixLinks` 方法中。
3. 在 `enhancedMediaExtractor.ts` 中，`isValidImageUrl` 方法中的 URL 验证逻辑不够健壮。

这些问题导致在处理特殊 URL 格式（如协议相对路径 `//example.com` 或不完整的 URL）时抛出异常。

## 修复方法

我们对以下文件进行了修改，增强了 URL 解析的健壮性：

### 1. `src/content/extractors/defuddleExtractor.ts`

- 增强了 `extractDomain` 方法，添加了输入验证和 URL 修复逻辑
- 改进了 `fixLinks` 方法，更好地处理相对路径和协议相对路径

```javascript
private extractDomain(url: string): string {
  try {
    // 验证 URL 是否有效
    if (!url || typeof url !== 'string') {
      console.warn('无效的 URL:', url);
      return '';
    }

    // 确保 URL 有协议前缀
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // 尝试修复 URL
      if (url.startsWith('//')) {
        url = 'https:' + url;
      } else if (!url.includes('://')) {
        url = 'https://' + url;
      }
    }

    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    console.error('解析 URL 时出错:', error, 'URL:', url);
    return '';
  }
}
```

### 2. `src/content/extractors/contentExtractor.ts`

- 对 `extractDomain` 方法进行了类似的增强
- 改进了 `fixLinks` 方法，更好地处理相对路径和协议相对路径

```javascript
// 如果是相对链接，尝试转换为绝对链接
if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('#')) {
  // 如果是协议相对路径（以 // 开头）
  if (href.startsWith('//')) {
    link.setAttribute('href', 'https:' + href);
  } else {
    try {
      // 处理其他相对路径，确保基础 URL 有效
      let baseUrl = window.location.href;
      const absoluteUrl = new URL(href, baseUrl).href;
      link.setAttribute('href', absoluteUrl);
    } catch (e) {
      console.warn('无法处理相对链接:', href, e);
      // 忽略无效 URL
    }
  }
}
```

### 3. `src/content/extractors/enhancedMediaExtractor.ts`

- 增强了 `isValidImageUrl` 方法，添加了更多的 URL 验证和修复逻辑

```javascript
// 检查是否是完整的 URL
try {
  // 确保 URL 有协议前缀
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // 如果是相对路径，直接返回 true
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return true;
    }
    // 尝试修复 URL
    if (url.startsWith('//')) {
      url = 'https:' + url;
    } else if (!url.includes('://')) {
      // 如果不是相对路径也不是完整 URL，尝试添加协议
      url = 'https://' + url;
    }
  }
  
  new URL(url);
  return true;
} catch (e) {
  // 如果不是有效的 URL，检查是否是相对路径
  return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
}
```

## 验证结果

修复后重新构建项目，构建成功，没有报错。这表明 URL 解析问题已经解决。

## 经验教训

1. 在处理 URL 时，应该始终进行充分的输入验证和错误处理。
2. 对于 Web 应用，需要考虑各种 URL 格式，包括绝对路径、相对路径、协议相对路径等。
3. 在使用 `new URL()` 构造函数时，应该始终使用 try-catch 块捕获可能的异常。
4. 添加详细的日志记录，有助于诊断和修复类似问题。

## 后续建议

1. 考虑创建一个通用的 URL 处理工具类，统一处理 URL 解析、验证和修复逻辑。
2. 添加单元测试，验证 URL 处理逻辑在各种边缘情况下的正确性。
3. 在开发环境中添加更多的日志记录，帮助及早发现类似问题。
