@echo off
echo ========================================
echo NestChat Bug修复验证脚本
echo ========================================
echo.

echo 正在启动后端服务器...
cd /d "e:\NestChat-1\backend"
start "NestChat Backend" cmd /k "node server.js"

timeout /t 3 >nul

echo 正在启动前端开发服务器...
cd /d "e:\NestChat-1\frontend"
start "NestChat Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo 服务启动完成！
echo ========================================
echo.
echo 请在浏览器访问: http://localhost:5173
echo.
echo 验证清单:
echo [1] 头像显示 - 检查图片加载失败时是否正常显示文字
echo [2] 图片上传 - 尝试上传5-10MB大图片
echo [3] 语音录音 - 测试麦克风权限和录音功能
echo [4] 消息加密 - 验证端到端加密是否正常
echo [5] 实时推送 - 多窗口测试消息同步
echo.
echo 按任意键关闭所有服务...
pause >nul

echo 正在关闭服务...
taskkill /fi "WindowTitle eq NestChat Backend*" /t /f >nul 2>&1
taskkill /fi "WindowTitle eq NestChat Frontend*" /t /f >nul 2>&1
echo 服务已关闭。
