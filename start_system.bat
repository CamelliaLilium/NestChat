@echo off
echo ========================================
echo 端到端加密通信系统启动脚本
echo ========================================
echo.

echo [1/3] 检查环境...
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ 错误: 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

echo ✅ Node.js 已安装

echo.
echo [2/3] 启动后端服务器...
echo 💡 正在启动后端服务器 (http://localhost:3001)
start "后端服务器" cmd /k "cd /d %~dp0backend && echo 启动后端服务器... && node server.js"

timeout /t 3 >nul

echo.
echo [3/3] 启动前端开发服务器...
echo 💡 正在启动前端开发服务器 (http://localhost:5173)
start "前端开发服务器" cmd /k "cd /d %~dp0frontend && echo 启动前端开发服务器... && npm run dev"

timeout /t 2 >nul

echo.
echo ========================================
echo 🚀 系统启动完成！
echo ========================================
echo.
echo 📱 前端应用: http://localhost:5173
echo 🔧 后端API: http://localhost:3001
echo 🧪 加密测试: %~dp0test_e2e_encryption.html
echo.
echo 💡 测试账号:
echo    alice@test.com / 123456
echo    bob@test.com / 123456
echo.
echo ⚠️  注意事项:
echo    - 确保两个端口都没有被占用
echo    - 首次运行可能需要安装依赖包
echo    - 建议使用Chrome/Firefox等现代浏览器
echo.
echo 📚 文档: E2E_ENCRYPTION_GUIDE.md
echo.

echo 按任意键打开加密测试页面...
pause >nul

echo 🧪 打开加密功能测试页面...
start "" "%~dp0test_e2e_encryption.html"

echo.
echo 🌟 系统已启动，祝使用愉快！
pause
