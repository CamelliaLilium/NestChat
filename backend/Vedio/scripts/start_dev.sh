#!/bin/bash
# 开发环境启动脚本

echo "🚀 启动视频聊天系统开发环境..."

# 检查是否在项目根目录
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ 请在项目根目录执行此脚本"
    exit 1
fi

# 启动后端服务
echo "📡 启动后端服务..."
cd backend

# 激活虚拟环境
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# 启动API服务器
echo "🔗 启动API服务器..."
python run_api.py --debug &
API_PID=$!

# 启动WebSocket服务器
echo "🌐 启动WebSocket服务器..."
python run_websocket.py &
WS_PID=$!

# 启动前端开发服务器
echo "🎨 启动前端开发服务器..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "✅ 所有服务已启动！"
echo ""
echo "访问地址："
echo "- 前端: http://localhost:5173"
echo "- API: http://localhost:5000"
echo "- WebSocket: ws://localhost:8765"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo '🛑 正在停止服务...'; kill $API_PID $WS_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait