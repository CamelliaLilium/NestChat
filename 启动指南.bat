@echo off
echo ========================================
echo NestChat 项目启动指南
echo ========================================
echo.

echo [问题解决] 端口占用错误处理
echo.
echo 如果遇到 "EADDRINUSE: address already in use :::3001" 错误：
echo.
echo 1. 终止所有Node进程：
echo    taskkill /F /IM node.exe
echo.
echo 2. 检查进程是否已清理：
echo    Get-Process -Name node -ErrorAction SilentlyContinue
echo.
echo 3. 如果还有进程，手动终止特定PID：
echo    taskkill /F /PID [进程ID]
echo.

echo [正确启动流程]
echo.
echo 第一步：启动后端服务器
echo =====================================
echo cd backend
echo node server.js
echo.
echo 成功标志：
echo - 数据库连接成功
echo - Server is running on port 3001
echo - Socket.IO server is ready
echo.

echo 第二步：启动前端服务器 (新终端窗口)
echo ======================================
echo cd frontend  
echo npm run dev
echo.
echo 成功标志：
echo - VITE ready in xxx ms
echo - Local: http://localhost:5173/
echo - Network: http://0.0.0.0:5173/
echo.

echo [访问地址]
echo 前端应用: http://localhost:5173
echo 后端API:  http://localhost:3001
echo.

echo [常见问题解决]
echo.
echo 1. 端口占用: taskkill /F /IM node.exe
echo 2. 数据库错误: cd backend ^&^& node init-db-new.js
echo 3. 前端依赖: cd frontend ^&^& npm install
echo 4. 后端依赖: cd backend ^&^& npm install
echo.

echo [验证步骤]
echo 1. 注册/登录账户
echo 2. 添加好友
echo 3. 测试消息发送
echo 4. 测试图片上传(包括大文件5-10MB)
echo 5. 测试语音录音功能
echo 6. 检查界面透明度
echo.

echo ========================================
echo 准备就绪！按照上述步骤启动项目
echo ========================================
pause
