# 以下所有命令均需要在git bash中运行

## 环境准备
确保已安装以下软件：
- Node.js (版本 16 或更高)
- npm (随 Node.js 安装)
- Python 3 (用于邮件发送功能)

## 开启后端服务器
```bash
cd backend
# 首次在该目录下运行，安装依赖
npm install
# 如果安装 better-sqlite3 失败，可以尝试：
# npm install better-sqlite3 --build-from-source
# 或使用内存存储模式（不安装 better-sqlite3）

# 启动服务器
node server.js
```

## 开启前端（新开一个git bash）
```bash
cd frontend
# 首次在该目录下运行，安装依赖
npm install
# 启动前端开发服务器
npm run dev
```

## 数据库功能
- 如果成功安装了 `better-sqlite3`，系统将使用 SQLite 数据库存储用户数据、好友关系和消息记录
- 如果未安装 `better-sqlite3`，系统将使用内存存储模式（服务器重启后数据丢失）
- 数据库文件位置：`backend/server.db`

## 功能特性
- ✅ 用户注册和登录（密码登录/验证码登录）
- ✅ 邮件验证码发送
- ✅ 用户数据持久化存储
- ✅ 好友关系管理（添加、接受、拒绝好友请求）
- ✅ 消息存储和历史记录
- ✅ 实时聊天功能