@echo off
echo ========================================
echo NestChat 修复验证 Checklist
echo ========================================
echo.

echo [验证准备]
echo 1. 确保后端服务器运行: http://localhost:3001
echo 2. 确保前端服务器运行: http://localhost:5173
echo 3. 准备测试图片文件 (小于1MB和5-10MB)
echo.

echo [核心修复验证]
echo.

echo [✓] 1. 消息列表透明度修复验证
echo    - 登录系统，查看聊天列表
echo    - 确认消息列表背景透明度为10%（较之前更透明）
echo    - 文件: frontend/src/components/ChatListPage.jsx:87
echo.

echo [✓] 2. 头像显示修复验证  
echo    - 查看聊天页面中的用户头像
echo    - 确认头像加载失败时显示首字母或问号
echo    - 确认不再出现"Cannot read properties of null"错误
echo    - 文件: frontend/src/components/VideoBubble.jsx:69-85
echo.

echo [✓] 3. 图片消息功能验证
echo    - 发送小图片文件（小于1MB）
echo    - 发送大图片文件（5-10MB）  
echo    - 点击图片查看全屏预览
echo    - 确认历史图片消息能正常加载
echo    - 文件: frontend/src/pages/ChatPage.jsx, backend/server.js
echo.

echo [✓] 4. 语音录音兼容性验证
echo    - 在Chrome浏览器测试录音功能
echo    - 在Safari/Edge浏览器测试录音功能
echo    - 测试拒绝麦克风权限的错误提示
echo    - 确认不支持录音的浏览器有友好提示
echo    - 文件: frontend/src/components/VoiceChat.jsx
echo.

echo [✓] 5. 图片上传413错误修复验证
echo    - 上传5-10MB的大图片
echo    - 确认不再出现"413 Payload Too Large"错误
echo    - 确认图片能正常发送和显示
echo    - 文件: backend/server.js:20-21
echo.

echo [详细测试步骤]
echo.
echo Step 1: 启动服务
echo   cd backend
echo   node server.js
echo.
echo Step 2: 启动前端
echo   cd frontend  
echo   npm run dev
echo.
echo Step 3: 功能测试
echo   1. 访问 http://localhost:5173
echo   2. 注册/登录账户
echo   3. 添加好友并开始聊天
echo   4. 依次测试上述5个修复点
echo.

echo [修复文件清单]
echo frontend/src/components/ChatListPage.jsx - 透明度和头像修复
echo frontend/src/components/VideoBubble.jsx - 头像错误处理和图片预览
echo frontend/src/pages/ChatPage.jsx - 图片发送逻辑
echo frontend/utils/api.js - 图片API接口
echo frontend/src/components/VoiceChat.jsx - 录音兼容性
echo backend/server.js - 请求大小限制和图片API
echo backend/init-db-new.js - 数据库表结构
echo.

echo [验证完成标准]
echo ✓ 所有5个问题都已修复
echo ✓ 不再出现JavaScript错误
echo ✓ 图片上传和显示正常
echo ✓ 语音录音在支持的浏览器正常工作
echo ✓ UI透明度符合预期
echo.

echo 验证报告: FINAL_VALIDATION_REPORT.md
echo 技术文档: BUGFIX_VALIDATION.md
echo.
pause
