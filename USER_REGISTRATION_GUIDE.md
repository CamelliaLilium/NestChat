# NestChat 用户注册和数据库集成说明

## 🎉 功能完成情况

✅ **已完成的功能：**
- 用户注册信息持久化存储到SQLite数据库
- 用户登录验证（密码登录 + 验证码登录）
- 数据库表结构完整（用户表、好友表、消息表、好友请求表）
- 前后端API接口完整连接
- 测试用户数据初始化
- 数据库查询和验证工具

## 📊 数据库结构

### UserTable (用户表)
```sql
CREATE TABLE UserTable (
  email VARCHAR(64) PRIMARY KEY,        -- 邮箱（主键）
  username VARCHAR(32) NOT NULL,        -- 用户名
  pwdhash CHAR(64) NOT NULL,            -- 密码哈希值
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- 创建时间
);
```

### FriendTable (好友关系表)
```sql
CREATE TABLE FriendTable (
  email1 VARCHAR(64),                   -- 用户1邮箱
  email2 VARCHAR(64),                   -- 用户2邮箱
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (email1, email2),
  FOREIGN KEY (email1) REFERENCES UserTable(email),
  FOREIGN KEY (email2) REFERENCES UserTable(email)
);
```

### MessageTable (消息表)
```sql
CREATE TABLE MessageTable (
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- 消息ID
  sender VARCHAR(64) NOT NULL,          -- 发送者邮箱
  receiver VARCHAR(64) NOT NULL,        -- 接收者邮箱
  content TEXT NOT NULL,                -- 消息内容
  timestamp REAL NOT NULL,              -- 时间戳
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender) REFERENCES UserTable(email),
  FOREIGN KEY (receiver) REFERENCES UserTable(email)
);
```

### FriendRequest (好友请求表)
```sql
CREATE TABLE FriendRequest (
  inviter VARCHAR(64),                  -- 邀请者邮箱
  invitee VARCHAR(64),                  -- 被邀请者邮箱
  request_time REAL NOT NULL,           -- 请求时间
  status VARCHAR(20) DEFAULT 'pending', -- 请求状态
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (inviter, invitee),
  FOREIGN KEY (inviter) REFERENCES UserTable(email),
  FOREIGN KEY (invitee) REFERENCES UserTable(email)
);
```

## 🚀 启动方式

### 1. 启动后端服务器
```bash
cd backend
npm start
# 或直接运行
node server.js
```

### 2. 启动前端服务器
```bash
cd frontend  
npm run dev
```

### 3. 访问应用
- 前端地址：http://localhost:5173
- 后端API：http://localhost:3001

## 🧪 测试账号

系统已预置以下测试账号：
- **alice@test.com** / 123456
- **bob@test.com** / 123456  
- **charlie@test.com** / 123456
- **david@test.com** / 123456

## 📝 API接口

### 用户认证
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 密码登录
- `POST /api/v1/auth/login-with-code` - 验证码登录
- `POST /api/v1/auth/send-code` - 发送验证码

### 用户管理
- `GET /api/v1/users/profile` - 获取用户信息
- `GET /api/v1/users` - 获取用户列表
- `GET /api/v1/users/search` - 搜索用户

### 健康检查
- `GET /` - 服务器状态
- `GET /api/v1/health` - API健康检查

## 🔧 数据库管理工具

### 初始化测试用户
```bash
cd backend
node init_test_users.js
```

### 检查数据库内容
```bash
cd backend
node check-db.js
```

### 设置完整数据库（如果需要）
```bash
cd backend
npm run setup
```

## 📋 注册流程测试

1. **打开前端应用** (http://localhost:5173)
2. **进入注册页面**
3. **填写注册信息**：
   - 邮箱：test@example.com
   - 昵称：测试用户
   - 密码：123456
   - 确认密码：123456
4. **发送验证码**（点击"发送验证码"按钮）
5. **输入验证码**（从控制台或邮箱获取）
6. **提交注册**
7. **检查数据库**：运行 `node check-db.js` 验证用户已存储

## 🔍 前后端连接验证

### 前端配置验证
- API基础URL：`http://localhost:3001/api/v1`
- 请求头包含用户邮箱：`user-email`
- Token认证：`Authorization: Bearer <token>`

### 后端数据流
1. 用户注册 → 验证码验证 → 密码哈希 → 存储到UserTable
2. 用户登录 → 数据库查询 → 密码验证 → 返回用户信息和Token
3. 用户信息获取 → 根据邮箱从数据库查询用户详情

## ⚠️ 注意事项

1. **数据库文件位置**：`backend/server.db`
2. **密码存储**：使用SHA256哈希，生产环境建议使用bcrypt
3. **验证码存储**：目前存储在内存中，生产环境建议使用Redis
4. **邮件发送**：需要配置SMTP设置（如果启用邮件发送功能）

### 🚨 常见问题解决

#### Git合并冲突错误
如果前端启动时遇到类似错误：
```
<<<<<<< HEAD
```
这是Git合并冲突导致的，解决方法：

1. **检查冲突文件**：
```bash
git status
```

2. **手动解决冲突**：
   - 打开有冲突的文件
   - 删除Git标记：`<<<<<<< HEAD`、`=======`、`>>>>>>> branch-name`
   - 保留需要的代码内容
   - 保存文件

3. **重新提交**：
```bash
git add .
git commit -m "解决合并冲突"
```

#### 预制测试账号位置
测试账号在以下文件中定义：
- `backend/init-db.js` - 原始数据库初始化
- `backend/init_test_users.js` - 独立测试用户脚本

运行方式：
```bash
cd backend
node init_test_users.js  # 添加/重置测试用户
node check-db.js        # 查看数据库内容
```

## 🎯 核心改进

相比之前的内存存储方式，现在所有用户数据都：
- ✅ **持久化存储**到SQLite数据库
- ✅ **数据完整性**通过外键约束保证
- ✅ **用户认证**基于数据库查询
- ✅ **前后端完全连接**，支持注册、登录、用户管理
- ✅ **支持并发**和数据一致性

用户在前端注册的所有信息现在都会自动保存到数据库中，重启服务器后数据不会丢失。
