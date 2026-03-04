#!/bin/bash
# 项目初始化脚本

echo "🚀 初始化视频聊天系统项目..."

# 检查Python版本
python3 --version || {
    echo "❌ 请安装Python 3.8+"
    exit 1
}

# 检查Node.js版本
node --version || {
    echo "❌ 请安装Node.js 16+"
    exit 1
}

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 安装前端依赖
echo "📦 安装前端依赖..."
cd ../frontend
npm install

echo "✅ 项目初始化完成！"
echo ""
echo "启动说明："
echo "1. 启动后端服务: ./scripts/start_dev.sh"
echo "2. 或手动启动:"
echo "   - 后端API: cd backend && python run_api.py"
echo "   - WebSocket: cd backend && python run_websocket.py"
echo "   - 前端: cd frontend && npm run dev"