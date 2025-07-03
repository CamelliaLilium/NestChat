@echo off
echo 正在安装数据库依赖...
echo.

echo 尝试安装 better-sqlite3...
npm install better-sqlite3

if %errorlevel% neq 0 (
    echo.
    echo better-sqlite3 安装失败，尝试使用源码编译安装...
    npm install better-sqlite3 --build-from-source
    
    if %errorlevel% neq 0 (
        echo.
        echo 警告：数据库依赖安装失败！
        echo 系统将使用内存存储模式运行（服务器重启后数据丢失）
        echo.
        echo 解决方案：
        echo 1. 确保已安装 Visual Studio Build Tools 或 Visual Studio
        echo 2. 确保已安装 Python 3
        echo 3. 运行 npm install --global windows-build-tools
        echo.
        pause
        exit /b 1
    )
)

echo.
echo ✅ 数据库依赖安装成功！
echo 现在可以运行 node server.js 启动服务器
echo.
pause
