#!/bin/bash

echo "========================================"
echo "        启动 NestChat 前端应用"
echo "========================================"
echo

echo "检查 Node.js 是否安装..."
if ! command -v node &> /dev/null; then
    echo "错误: 未检测到 Node.js，请先安装 Node.js"
    echo "下载地址: https://nodejs.org/"
    read -p "按 Enter 键退出..."
    exit 1
fi

echo "Node.js 版本:"
node --version

echo
echo "检查项目依赖..."
if [ ! -d "node_modules" ]; then
    echo "安装项目依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "错误: 依赖安装失败"
        read -p "按 Enter 键退出..."
        exit 1
    fi
fi

echo
echo "========================================"
echo "启动前端开发服务器..."
echo "应用将运行在: http://localhost:5173"
echo "确保后端服务器已在 http://localhost:3001 运行"
echo "按 Ctrl+C 停止服务器"
echo "========================================"
echo

npm run dev
