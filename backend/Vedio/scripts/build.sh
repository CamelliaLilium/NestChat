#!/bin/bash
# 构建脚本

echo "🔨 构建视频聊天系统..."

# 构建前端
echo "📦 构建前端..."
cd frontend
npm run build

# 构建后端（如果需要）
echo "📦 准备后端..."
cd ../backend

# 创建部署目录
mkdir -p ../dist/backend
mkdir -p ../dist/frontend

# 复制后端文件
cp -r . ../dist/backend/
# 复制前端构建文件
cp -r ../frontend/dist/* ../dist/frontend/

echo "✅ 构建完成！部署文件在 dist/ 目录"