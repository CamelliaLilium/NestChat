#!/bin/bash

echo "========================================"
echo "        启动 NestChat 后端服务器"
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
echo "检查数据库依赖..."
if [ ! -d "node_modules/better-sqlite3" ]; then
    echo "数据库依赖未安装，尝试安装..."
    npm install better-sqlite3
    if [ $? -ne 0 ]; then
        echo "警告: 数据库依赖安装失败，将使用内存存储模式"
        echo "服务器重启后数据会丢失"
    fi
fi

echo
echo "检查数据库文件..."
if [ ! -f "server.db" ]; then
    if [ -d "node_modules/better-sqlite3" ]; then
        echo "首次运行，正在初始化数据库..."
        node init-db.js
        if [ $? -ne 0 ]; then
            echo "警告: 数据库初始化失败"
        fi
    fi
fi

echo
echo "========================================"
echo "启动服务器..."
echo "服务器将运行在: http://localhost:3001"
echo "前端应用: http://localhost:5173"
echo "按 Ctrl+C 停止服务器"
echo "========================================"
echo

node server.js
