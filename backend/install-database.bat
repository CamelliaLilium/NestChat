@echo off
echo 正在安装数据库依赖...
cd /d "%~dp0"

echo 尝试安装 better-sqlite3...
npm install better-sqlite3

if %ERRORLEVEL% neq 0 (
    echo.
    echo 安装 better-sqlite3 失败，尝试其他方法...
    echo 1. 尝试使用 --build-from-source 选项
    npm install better-sqlite3 --build-from-source
    
    if %ERRORLEVEL% neq 0 (
        echo.
        echo 2. 尝试使用全局安装的 windows-build-tools
        echo 如果仍然失败，请手动安装 Python 和 Visual Studio Build Tools
        echo.
        echo 替代方案：系统将使用内存存储模式（数据不会持久化）
        echo.
        pause
        exit /b 1
    )
)

echo.
echo ✅ better-sqlite3 安装成功！
echo 现在可以启动服务器了：node server.js
echo.
pause
