# NestChat 快速启动指南

## Windows 快速启动

### 1. 后端服务器
```cmd
cd backend
npm install --ignore-optional
node server.js
```

### 2. 前端应用（新开终端）
```cmd
cd frontend
npm install
npm run dev
```

## 访问地址
- 前端: http://localhost:5173
- 后端: http://localhost:3001

## 测试账号
- alice@test.com / 123456
- bob@test.com / 123456

## 注意事项
- 当前版本使用内存存储，重启后数据丢失
- 确保先启动后端再启动前端
