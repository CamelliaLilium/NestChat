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

# 安装数据库依赖（可选，但推荐）
# Windows用户可以运行：
# install-db.bat
# 或手动安装：
npm install better-sqlite3

# 初始化数据库并添加测试数据（可选）
npm run init-db

# 启动服务器
node server.js
# 或使用 npm start
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

## 测试账号（运行 npm run init-db 后可用）
- `alice@test.com` / `123456`
- `bob@test.com` / `123456`  
- `charlie@test.com` / `123456`

## 故障排除

### PowerShell执行策略问题（Windows）
如果遇到"禁止运行脚本"错误：
1. 以管理员身份运行PowerShell
2. 执行 `Set-ExecutionPolicy RemoteSigned`
3. 选择 `Y` 确认
4. 或者使用Git Bash代替PowerShell运行命令

### 数据库安装问题
如果 `better-sqlite3` 安装失败：
1. 确保已安装 Visual Studio Build Tools 或 Visual Studio
2. 确保已安装 Python 3
3. 运行 `npm install --global windows-build-tools`
4. 尝试 `npm install better-sqlite3 --build-from-source`

### 邮件发送问题
1. 确保已安装 Python 3
2. 检查 `backend/send_email.py` 文件是否存在
3. 查看服务器控制台的错误信息

### 端口占用问题
如果端口 3001 被占用，可以修改 `backend/server.js` 中的端口设置

## API文档
后端服务器启动后，可以访问以下端点：

### 认证相关
- `POST /api/v1/auth/login` - 密码登录
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/send-code` - 发送验证码
- `POST /api/v1/auth/login-with-code` - 验证码登录

### 好友管理
- `GET /api/v1/friends` - 获取好友列表
- `POST /api/v1/friends/request` - 发送好友请求
- `GET /api/v1/friends/requests` - 获取好友请求
- `POST /api/v1/friends/accept` - 接受好友请求
- `POST /api/v1/friends/reject` - 拒绝好友请求

### 消息管理
- `GET /api/v1/messages/:friendEmail` - 获取聊天记录
- `POST /api/v1/messages` - 发送消息