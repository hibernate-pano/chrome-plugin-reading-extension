#!/bin/bash

# 显示颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 显示标题
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}Chrome Reading Extension Build Script${NC}"
echo -e "${BLUE}======================================${NC}"

# 检查是否安装了pnpm
if ! command -v pnpm &> /dev/null
then
    echo -e "${RED}Error: pnpm is not installed.${NC}"
    echo -e "${YELLOW}Please install pnpm using: npm install -g pnpm${NC}"
    exit 1
fi

# 清理dist目录
echo -e "${YELLOW}Cleaning dist directory...${NC}"
rm -rf dist

# 安装依赖
echo -e "${YELLOW}Installing dependencies...${NC}"
pnpm install

# 构建各个部分
echo -e "${YELLOW}Building extension...${NC}"

echo -e "${GREEN}Building Content Script...${NC}"
pnpm exec vite build --config vite.content.config.ts

echo -e "${GREEN}Building Background Script...${NC}"
pnpm exec vite build --config vite.background.config.ts

echo -e "${GREEN}Building Popup...${NC}"
pnpm exec vite build --config vite.popup.config.ts

# 复制静态文件
echo -e "${YELLOW}Copying static files...${NC}"
cp -r public/* dist/

# 完成
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "${YELLOW}The extension is ready in the 'dist' directory.${NC}"
echo -e "${YELLOW}You can load it in Chrome by going to:${NC}"
echo -e "${BLUE}chrome://extensions/${NC} > ${BLUE}Load unpacked${NC} > select the ${BLUE}dist${NC} folder."
