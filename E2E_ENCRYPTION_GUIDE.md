# 端到端实时加密通信系统

## 📋 功能概述

本系统实现了对用户透明的端到端实时加密通信，支持文本、图片、语音三种消息类型，具备以下特性：

### ✨ 核心特性
- **🔐 端到端加密**：基于RSA密钥协商 + AES对称加密
- **🎭 图片隐写术**：使用LSB隐写技术隐藏加密数据
- **🔄 用户透明**：加解密过程完全自动化，用户无感知
- **💬 多媒体支持**：文本、图片、语音消息的统一加密传输
- **⚡ 实时通信**：基于WebSocket的即时消息推送
- **🛡️ 安全性保障**：密钥自动生成、交换和管理

### 🏗️ 技术架构

#### 前端技术栈
- **React 18.2** - 用户界面框架
- **crypto-js** - AES加密库
- **jsencrypt** - RSA加密库  
- **Canvas API** - 图片隐写术实现
- **Socket.io-client** - WebSocket实时通信

#### 后端技术栈
- **Node.js + Express** - Web服务器
- **Socket.io** - WebSocket服务端
- **SQLite3** - 消息存储数据库
- **Python加密模块** - 后端加密支持(可选)

## 🔧 系统部署

### 1. 环境要求
- Node.js 16+ 
- npm 或 yarn
- 现代浏览器(支持Canvas API)

### 2. 安装依赖

#### 后端依赖
```bash
cd backend
npm install express socket.io cors sqlite3 crypto
```

#### 前端依赖  
```bash
cd frontend
npm install react react-dom socket.io-client crypto-js jsencrypt
```

### 3. 启动服务

#### 启动后端服务器
```bash
cd backend
node server.js
# 服务器将在 http://localhost:3001 启动
```

#### 启动前端开发服务器
```bash
cd frontend  
npm run dev
# 前端将在 http://localhost:5173 启动
```

## 🔒 加密流程详解

### 密钥协商流程
1. **RSA密钥对生成**：每个用户生成1024位RSA密钥对
2. **公钥交换**：通过后端API交换RSA公钥
3. **会话密钥生成**：为每对用户生成唯一的AES-256会话密钥
4. **密钥缓存**：会话密钥在内存中缓存，支持多对话管理

### 消息加密流程
1. **消息打包**：将消息内容、类型、时间戳打包为JSON
2. **AES加密**：使用会话密钥对消息包进行AES加密
3. **随机图片**：从后端获取随机图片作为隐写载体
4. **LSB隐写**：将加密数据隐写到图片的蓝色通道LSB
5. **传输发送**：通过API/WebSocket发送隐写图片

### 消息解密流程
1. **接收图片**：通过WebSocket接收隐写图片
2. **LSB提取**：从图片蓝色通道LSB提取加密数据
3. **AES解密**：使用会话密钥解密数据包
4. **消息还原**：解析JSON获取原始消息内容
5. **UI显示**：在聊天界面透明显示明文消息

## 📱 用户界面

### 主要页面
- **好友页面** (`FriendsPage.jsx`)：好友列表、搜索、添加好友
- **聊天页面** (`ChatPage.jsx`)：消息发送接收、多媒体支持
- **登录注册**：邮箱验证、密码登录

### 消息类型支持
- **📝 文本消息**：支持中文、Emoji、特殊字符
- **🖼️ 图片消息**：用户选择图片，系统自动加密隐写传输
- **🎙️ 语音消息**：录制语音，加密后通过隐写术传输

## 🧪 测试功能

### 加密功能测试
访问 `test_e2e_encryption.html` 可以测试：
- RSA密钥对生成
- AES加密解密
- LSB图片隐写术
- 端到端加密完整流程
- 性能基准测试

### 测试步骤
1. 打开测试页面：`file:///e:/NestChat-1/test_e2e_encryption.html`
2. 依次运行各项测试
3. 查看加密解密结果和性能数据

## 🔧 核心组件

### 1. 加密管理器 (`encryption.js`)
```javascript
// 主要接口
class EncryptionManager {
  async keyExchange(peerEmail, peerPublicKey)    // 密钥协商
  async encryptAndHideMessage(message, peerEmail, type)  // 加密隐写
  async decryptAndExtractMessage(image, senderEmail)     // 解隐写解密
}
```

### 2. 隐写术模块 (`steganography.js`)
```javascript
// LSB隐写接口
export async function encodeTextInJpg(imageBase64, text)  // 文本隐写
export async function decodeTextFromJpg(imageBase64)      // 文本提取
```

### 3. API接口 (`api.js`)
```javascript
// 加密消息API
async sendEncryptedMessage(receiverId, content, type, encryptedImage)
async exchangePublicKey(peerEmail, publicKey)
async getUserPublicKey(userEmail)  
```

## 🛡️ 安全特性

### 加密强度
- **RSA-1024**：密钥协商和数字签名
- **AES-256**：对称加密，性能与安全平衡
- **会话隔离**：每对用户独立的会话密钥
- **前向安全**：支持密钥更新和清理

### 隐写术特性
- **LSB算法**：最低有效位隐写，视觉不可感知
- **容量自适应**：根据图片大小自动调整隐写容量
- **数据完整性**：长度前缀确保数据完整提取
- **载体随机化**：随机选择图片避免模式识别

### 传输安全
- **HTTPS支持**：生产环境建议启用HTTPS
- **WebSocket加密**：支持WSS安全连接
- **会话管理**：自动密钥轮换和过期处理

## 📊 性能优化

### 前端优化
- **密钥缓存**：避免重复密钥协商
- **异步处理**：加解密操作不阻塞UI线程
- **降级机制**：加密失败时自动降级为普通传输
- **图片复用**：隐写载体图片缓存和复用

### 后端优化
- **连接池管理**：WebSocket连接复用
- **数据库索引**：消息查询性能优化
- **内存管理**：会话密钥内存管理
- **静态资源**：图片资源CDN分发

## 🚀 部署建议

### 开发环境
- 使用 `npm run dev` 启动前端热重载
- 启用详细日志查看加密流程
- 使用测试页面验证加密功能

### 生产环境
- 启用HTTPS和WSS安全连接
- 配置图片CDN加速载体下载
- 启用数据库备份和恢复
- 配置负载均衡和高可用性

### 安全建议
- 定期更新加密库版本
- 监控密钥泄露风险
- 实施访问控制和审计日志
- 考虑硬件安全模块(HSM)支持

## 🐛 故障排除

### 常见问题
1. **加密失败**：检查crypto-js和jsencrypt库是否正确安装
2. **隐写失败**：确认浏览器支持Canvas API
3. **连接问题**：检查WebSocket连接和后端服务状态
4. **性能问题**：监控加密解密耗时，考虑优化图片大小

### 调试工具
- 浏览器开发者工具控制台查看加密日志
- 网络面板监控API请求和WebSocket消息
- 测试页面验证加密解密功能
- 后端日志查看服务器端处理流程

## 📈 后续扩展

### 功能扩展
- **群组加密**：多人聊天的密钥分发
- **文件传输**：大文件的分块加密传输
- **消息撤回**：加密消息的安全撤回机制
- **端设备管理**：多设备密钥同步

### 安全增强
- **零知识证明**：身份验证的隐私保护
- **完美前向安全**：定期密钥更新机制
- **量子抗性**：后量子密码学算法集成
- **安全审计**：第三方安全评估和认证

---

## 📞 技术支持

如需技术支持或发现问题，请检查：
1. 确认所有依赖包正确安装
2. 查看浏览器控制台和后端日志
3. 使用测试页面验证加密功能
4. 参考本文档的故障排除章节

**系统版本**：v1.0.0  
**最后更新**：2025年7月3日
