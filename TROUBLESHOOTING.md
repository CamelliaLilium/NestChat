# 网络异常问题排查指南

## 问题现象
前端登录时显示"网络异常，请稍后重试"

## 可能原因和解决方案

### 1. 后端服务器未启动
**检查方法：**
```bash
# 在 PowerShell 中运行
cd e:\ChatAPP\backend
node server.js
```

**预期输出：**
```
🚀 服务器运行在 http://localhost:3001
📋 测试账号:
   alice@test.com / 123456
   bob@test.com / 123456
```

**解决方案：**
- 确保在 backend 目录下运行 `node server.js`
- 或者直接运行 `start.bat`

### 2. 端口被占用
**检查方法：**
```bash
netstat -ano | findstr :3001
```

**解决方案：**
- 如果端口被占用，结束占用进程或更换端口
- 修改 server.js 中的 PORT 变量

### 3. 依赖包未安装
**检查方法：**
查看 backend 目录下是否有 node_modules 文件夹

**解决方案：**
```bash
cd e:\ChatAPP\backend
npm install
```

### 4. API路径不匹配
**当前配置：**
- 前端配置：`http://localhost:3001/api/v1`
- 后端路径：`/api/v1/auth/login`
- 完整URL：`http://localhost:3001/api/v1/auth/login`

### 5. CORS跨域问题
**后端已配置：**
```javascript
app.use(cors()); // 允许所有来源
```

### 6. 防火墙阻止
**解决方案：**
- 临时关闭Windows防火墙测试
- 或添加端口3001的防火墙例外

## 测试步骤

### Step 1: 测试服务器基础连接
1. 打开浏览器访问：`http://localhost:3001`
2. 应该看到JSON格式的响应

### Step 2: 测试登录API
1. 打开 `e:\ChatAPP\frontend\network-test.html`
2. 点击测试按钮查看详细信息

### Step 3: 检查浏览器控制台
1. 按F12打开开发者工具
2. 查看Console和Network标签页的错误信息

## 常见错误信息及解决方案

### "Failed to fetch"
- 原因：后端服务器未启动或端口错误
- 解决：启动后端服务器

### "CORS policy"
- 原因：跨域请求被阻止
- 解决：确保后端CORS配置正确

### "JSON parse error"
- 原因：服务器返回非JSON数据
- 解决：检查API端点是否正确

### "Network request failed"
- 原因：网络连接问题
- 解决：检查防火墙和网络设置

## 调试技巧

### 添加调试日志
在前端API调用中已添加console.log：
```javascript
console.log('API请求:', { url, config });
console.log('API响应数据:', data);
```

### 查看网络请求
1. F12 -> Network标签页
2. 尝试登录
3. 查看请求详情和响应内容

## 修复后的代码变化

### 后端修改
1. 添加了 `success` 字段到登录响应
2. 统一了用户字段名（name 和 username）
3. 添加了健康检查端点

### 前端修改
1. 改进了错误处理逻辑
2. 添加了详细的调试日志
3. 兼容了不同的响应格式

## 快速验证
运行以下命令快速测试：
```bash
# 启动后端
cd e:\ChatAPP\backend
node server.js

# 在另一个终端测试API
curl -X POST http://localhost:3001/api/v1/auth/login -H "Content-Type: application/json" -d "{\"email\":\"alice@test.com\",\"password\":\"123456\"}"
```

预期响应：
```json
{
  "success": true,
  "token": "fake-token-1",
  "user": {
    "id": 1,
    "email": "alice@test.com",
    "name": "Alice",
    "username": "Alice"
  }
}
```

## 验证码发送失败问题解决方案

### 问题描述
注册账号时发送验证码失败，前端与后端接口不匹配。

### 已修复的问题
1. **后端缺少验证码API**：添加了 `/api/v1/auth/send-code` 端点
2. **注册接口不支持验证码**：修改了 `/api/v1/auth/register` 端点
3. **前端API调用参数不匹配**：更新了前端API调用方法
4. **验证码登录功能**：添加了 `/api/v1/auth/login-with-code` 端点

### 新增的API端点

#### 1. 发送验证码
```
POST /api/v1/auth/send-code
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**响应格式:**
```json
{
  "success": true,
  "message": "验证码已发送到您的邮箱",
  "dev_code": "123456"  // 开发环境下返回，生产环境应删除
}
```

#### 2. 验证码登录
```
POST /api/v1/auth/login-with-code
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

#### 3. 修改后的注册接口
```
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "用户昵称",
  "password": "123456",
  "verificationCode": "123456"
}
```

### 验证码功能特性
- **有效期**：5分钟
- **尝试次数**：最多30次错误尝试
- **验证码长度**：6位数字
- **存储方式**：内存存储（生产环境建议使用Redis）

### 测试验证码功能
1. **启动后端服务器**：
   ```bash
   cd e:\ChatAPP\backend
   node server.js
   ```

2. **启动前端应用**：
   ```bash
   cd e:\ChatAPP\frontend
   npm run dev
   ```

3. **测试注册功能**：
   - 访问前端应用
   - 点击注册页面
   - 输入邮箱并发送验证码
   - 检查邮箱收到验证码后完成注册

### 验证码相关错误处理
- `VCODE_EXPIRED`：验证码已过期
- `VCODE_ERROR`：验证码错误
- `USER_EXISTS`：用户已存在

### 🔧 真实邮件发送功能配置

#### 系统架构
- **前端**: React (连接Node.js后端)
- **Node.js后端**: 处理HTTP API请求
- **Python后端**: 负责真实邮件发送

#### 邮件发送流程
1. 前端发送验证码请求到Node.js
2. Node.js生成验证码并调用Python脚本
3. Python脚本通过SMTP发送真实邮件
4. Node.js返回发送结果给前端

#### 环境要求
- **Python 3.x**: 用于邮件发送
- **Node.js**: 用于Web API服务
- **网络连接**: 能够访问QQ邮箱SMTP服务器

#### 邮件服务配置
- **SMTP服务器**: smtp.qq.com (QQ邮箱)
- **发送邮箱**: 202695135@qq.com
- **认证方式**: 应用程序专用密码
- **加密方式**: SSL (端口465)

#### 测试邮件发送功能
```bash
# 测试Python邮件发送
cd e:\ChatAPP\backend
python test_email.py

# 手动测试单个邮件
python send_email.py your-email@example.com TEST123
```

#### 验证码格式
- **Python版本**: 6位字符（数字+大写字母）如: "2A3K9B"
- **字符集**: "23456789QWERTYUPASDFGHJKZXCVBNM98765432"
- **有效期**: 10分钟（Python）/ 5分钟（Node.js存储）

### 🐛 邮件发送问题排查

#### 常见错误及解决方案

**1. "邮件发送服务启动失败，请确保已安装Python"**
- 检查Python是否安装: `python --version`
- 确保Python在系统PATH中
- Windows用户可能需要使用 `python3` 命令

**2. "邮件发送失败"**
- 检查网络连接
- 验证SMTP服务器配置
- 确认QQ邮箱授权码是否正确
- 检查目标邮箱地址格式

**3. "Python脚本执行失败"**
- 确认 `send_email.py` 文件存在
- 检查文件权限
- 查看详细错误日志

**4. "验证码格式不匹配"**
- Node.js和Python生成的验证码格式现已统一
- 都使用6位字符（数字+大写字母）

#### 调试步骤
1. **测试Python邮件功能**:
   ```bash
   python test_email.py
   ```

2. **查看Node.js日志**:
   启动server.js后观察控制台输出

3. **检查前端网络请求**:
   浏览器F12 -> Network标签页

4. **验证邮件接收**:
   - 检查收件箱
   - 检查垃圾邮件/spam文件夹
   - 确认邮箱地址拼写正确
