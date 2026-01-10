# Requirements Document

## Introduction

彻底重构 AI Reading Extension，从当前过度工程化的 100+ 文件架构简化为一个精简、高效、易维护的现代 Chrome 扩展。核心目标是用更少的代码实现更好的用户体验。

## Glossary

- **Reader_Mode**: 阅读模式，将网页内容转换为干净、可定制的阅读界面
- **Content_Script**: Chrome 扩展注入到网页中的脚本
- **Popup**: 点击扩展图标时显示的弹出界面
- **Settings_Panel**: 阅读模式下的悬浮设置面板
- **Content_Extractor**: 从网页中提取主要内容的模块
- **Theme**: 阅读界面的视觉主题（浅色/深色/护眼）
- **Storage_Manager**: 管理 Chrome 本地存储的模块

## Requirements

### Requirement 1: 一键启用阅读模式

**User Story:** As a user, I want to enable reading mode with a single click, so that I can quickly start reading without distractions.

#### Acceptance Criteria

1. WHEN a user clicks the extension icon, THE Popup SHALL display a simple toggle switch for reading mode
2. WHEN a user toggles the switch to ON, THE Content_Script SHALL extract and display the page content in reading mode within 2 seconds
3. WHEN a user toggles the switch to OFF, THE Content_Script SHALL restore the original page content immediately
4. IF the page content cannot be extracted, THEN THE Content_Script SHALL display a user-friendly error message
5. THE Popup SHALL display the current reading mode state accurately

### Requirement 2: 智能内容提取

**User Story:** As a user, I want the extension to automatically extract the main content from any webpage, so that I can read without ads and distractions.

#### Acceptance Criteria

1. WHEN reading mode is enabled, THE Content_Extractor SHALL use Mozilla Readability to extract the main article content
2. WHEN content is extracted, THE Content_Extractor SHALL preserve essential elements including headings, paragraphs, images, code blocks, and lists
3. WHEN content is extracted, THE Content_Extractor SHALL remove navigation, ads, sidebars, and other non-essential elements
4. IF extraction fails, THEN THE Content_Extractor SHALL return a descriptive error with the failure reason
5. THE Content_Extractor SHALL cache extracted content for the current page session to avoid re-extraction

### Requirement 3: 可定制的阅读体验

**User Story:** As a user, I want to customize the reading experience, so that I can read comfortably according to my preferences.

#### Acceptance Criteria

1. WHEN reading mode is active, THE Settings_Panel SHALL provide controls for theme (light/dark/sepia), font size (12-32px), line height (1.2-2.0), and page width (600-1200px)
2. WHEN a user changes any setting, THE Reader_Mode SHALL apply the change immediately without page reload
3. WHEN settings are changed, THE Storage_Manager SHALL persist them to Chrome local storage
4. WHEN reading mode is enabled on a new page, THE Reader_Mode SHALL apply previously saved settings
5. THE Settings_Panel SHALL be accessible via a floating button in reading mode

### Requirement 4: 代码块语法高亮

**User Story:** As a developer, I want code blocks to be syntax highlighted, so that I can read technical articles comfortably.

#### Acceptance Criteria

1. WHEN content contains code blocks, THE Reader_Mode SHALL detect the programming language automatically
2. WHEN a code block is rendered, THE Reader_Mode SHALL apply syntax highlighting using a lightweight highlighter
3. WHEN a code block is displayed, THE Reader_Mode SHALL provide a copy-to-clipboard button
4. THE Reader_Mode SHALL support at least 10 common programming languages (JavaScript, TypeScript, Python, Java, C/C++, Go, Rust, HTML, CSS, SQL)

### Requirement 5: 本地数据存储

**User Story:** As a privacy-conscious user, I want all my data stored locally, so that my reading preferences are never sent to external servers.

#### Acceptance Criteria

1. THE Storage_Manager SHALL store all user settings in Chrome local storage only
2. THE Storage_Manager SHALL NOT send any data to external servers
3. WHEN settings are saved, THE Storage_Manager SHALL validate the data before storing
4. WHEN settings are loaded, THE Storage_Manager SHALL return default values for any missing or invalid settings
5. THE Storage_Manager SHALL provide a simple API for get/set operations with TypeScript type safety

### Requirement 6: 简洁的用户界面

**User Story:** As a user, I want a clean and intuitive interface, so that I can focus on reading without learning complex controls.

#### Acceptance Criteria

1. THE Popup SHALL have a minimal design with only essential controls (reading mode toggle)
2. THE Settings_Panel SHALL use a compact, floating design that doesn't obstruct reading
3. WHEN the Settings_Panel is open, THE Reader_Mode SHALL allow closing it by clicking outside
4. THE Reader_Mode SHALL use smooth transitions for all UI state changes
5. THE Reader_Mode SHALL be fully keyboard accessible (Tab navigation, Enter/Space activation)

### Requirement 7: 性能优化

**User Story:** As a user, I want the extension to be fast and lightweight, so that it doesn't slow down my browsing experience.

#### Acceptance Criteria

1. THE Content_Script SHALL NOT inject any code until reading mode is explicitly enabled
2. WHEN reading mode is enabled, THE Content_Script SHALL complete initialization within 500ms
3. THE extension bundle size SHALL be less than 500KB (uncompressed)
4. THE Reader_Mode SHALL NOT cause any memory leaks when toggling on/off repeatedly
5. THE Content_Script SHALL clean up all resources when reading mode is disabled

### Requirement 8: 错误处理

**User Story:** As a user, I want clear feedback when something goes wrong, so that I know what happened and what to do.

#### Acceptance Criteria

1. IF content extraction fails, THEN THE Reader_Mode SHALL display a friendly error message with a retry option
2. IF storage operations fail, THEN THE Storage_Manager SHALL log the error and use default values
3. THE Reader_Mode SHALL NOT crash or freeze the page under any error condition
4. WHEN an error occurs, THE Reader_Mode SHALL provide a way to report the issue or retry the operation
