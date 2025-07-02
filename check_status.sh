#!/bin/bash

# NestChat 系统状态检查脚本

echo "🔍 检查 NestChat 系统状态..."
echo ""

# 检查后端
echo "1️⃣ 检查后端状态..."
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ 后端服务器运行正常 (http://localhost:3001)"
    
    # 获取健康检查信息
    health=$(curl -s http://localhost:3001/api/v1/health 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "✅ API健康检查通过"
        echo "   数据库用户数量: $(echo $health | grep -o '"users_count":[0-9]*' | cut -d':' -f2)"
    fi
else
    echo "❌ 后端服务器未运行，请启动: cd backend && node server.js"
fi

echo ""

# 检查前端
echo "2️⃣ 检查前端状态..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ 前端服务器运行正常 (http://localhost:5173)"
else
    echo "❌ 前端服务器未运行，请启动: cd frontend && npm run dev"
fi

echo ""

# 检查数据库
echo "3️⃣ 检查数据库状态..."
if [ -f "backend/server.db" ]; then
    echo "✅ 数据库文件存在: backend/server.db"
    
    # 检查数据库用户数量
    cd backend
    user_count=$(node -e "
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('server.db');
    db.get('SELECT COUNT(*) as count FROM UserTable', (err, row) => {
        if (!err) console.log(row.count);
        db.close();
    });
    " 2>/dev/null)
    
    if [ ! -z "$user_count" ]; then
        echo "   数据库用户数量: $user_count"
    fi
    cd ..
else
    echo "❌ 数据库文件不存在，请运行: cd backend && node init_test_users.js"
fi

echo ""

# 检查Git状态
echo "4️⃣ 检查Git状态..."
if git status --porcelain 2>/dev/null | grep -q "^UU\|^AA\|^DD"; then
    echo "⚠️  发现Git合并冲突，请解决后重新提交"
    echo "   冲突文件:"
    git status --porcelain | grep "^UU\|^AA\|^DD"
else
    echo "✅ 没有Git合并冲突"
fi

echo ""
echo "📋 系统状态检查完成！"
echo ""
echo "💡 如果一切正常，可以访问:"
echo "   - 前端应用: http://localhost:5173"
echo "   - 后端API: http://localhost:3001"
echo ""
echo "🧪 测试账号:"
echo "   - alice@test.com / 123456"
echo "   - bob@test.com / 123456"
echo "   - charlie@test.com / 123456"
echo "   - david@test.com / 123456"
