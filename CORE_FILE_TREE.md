# NestChat 端到端加密通信系统 - 核心文件树

本文档列出了 NestChat 系统中的核心文件，排除了环境配置、测试文件、重复资源等非关键文件。

## 📁 核心文件结构

```
NestChat-1/
├── 📝 README.md                           # 项目主文档
├── 📝 E2E_ENCRYPTION_GUIDE.md             # 端到端加密使用指南
├── 📝 CHATLIST_FEATURES.md                # ChatList功能详细说明
├── 📝 BUGFIX_VERIFICATION.md              # 问题修复验证清单
├── 🚀 start_system.bat                    # 一键启动脚本
├── 🧪 test_e2e_encryption.html            # 端到端加密测试页面
│
├── 🖥️ frontend/                           # 前端核心文件
│   ├── 📄 index.html                      # 应用入口HTML
│   ├── 📄 package.json                    # 前端依赖配置
│   ├── ⚙️ vite.config.js                  # Vite构建配置
│   │
│   ├── 🎨 public/                         # 静态资源
│   │   ├── � background/                 # 背景图片
│   │   │   ├── 🖼️ ChatBack.png            # 聊天背景
│   │   │   ├── 🖼️ LoginBack.png           # 登录背景
│   │   │   └── 🖼️ message.png             # 消息背景
│   │   ├── 📁 Icon/                       # 图标资源
│   │   │   ├── 🖼️ logo.png                # 应用Logo
│   │   │   ├── 🖼️ 电话.svg                # 电话图标
│   │   │   ├── �️ connect.svg             # 连接图标
│   │   │   ├── 🖼️ hungup.svg              # 挂断图标
│   │   │   ├── 🖼️ OpenAudio.png           # 开启音频图标
│   │   │   ├── 🖼️ OpenVedio.png           # 开启视频图标
│   │   │   ├── 🖼️ ShutAudio.png           # 关闭音频图标
│   │   │   └── 🖼️ ShutVedio.png           # 关闭视频图标
│   │   └── 📁 picture/                    # 示例图片(保留少量)
│   │       ├── 🖼️ 1.png
│   │       ├── 🖼️ 2.png
│   │       └── 🖼️ 3.png
│   │
│   ├── 💻 src/                            # 源代码目录
│   │   ├── 🎯 main.jsx                    # React应用入口
│   │   ├── 🎯 App.jsx                     # 主应用组件
│   │   ├── 🎨 App.css                     # 应用样式
│   │   ├── 🎨 index.css                   # 全局样式
│   │   │
│   │   ├── 📄 pages/                      # 页面组件
│   │   │   ├── 🔐 LoginCodePage.jsx       # 登录验证页面
│   │   │   ├── 🔐 LoginVcodePage.jsx      # 登录验证码页面
│   │   │   ├── 📝 SignUpPage.jsx          # 注册页面
│   │   │   ├── 💬 ChatPage.jsx            # ⭐ 聊天页面(核心)
│   │   │   └── 👥 FriendsPage_fixed.jsx   # ⭐ 好友页面(核心)
│   │   │
│   │   ├── 🧩 components/                 # 通用组件
│   │   │   ├── 💬 ChatListPage.jsx        # ⭐ 聊天列表组件(核心)
│   │   │   ├── 💬 ChatBubble.jsx          # 消息气泡组件
│   │   │   ├── 💬 ChatInputBar.jsx        # 消息输入组件
│   │   │   ├── 🎞️ VideoBubble.jsx         # ⭐ 视频/头像气泡组件(核心)
│   │   │   ├── 👥 FriendsList.jsx         # 好友列表组件
│   │   │   ├── 👥 FriendItem.jsx          # 好友项组件
│   │   │   ├── 👥 FriendDetail.jsx        # 好友详情组件
│   │   │   ├── 📷 PhotoSelect.jsx         # 照片选择组件
│   │   │   ├── 🎤 VoiceChat.jsx           # 语音聊天组件
│   │   │   ├── 📞 VideoCallModal.jsx      # 视频通话弹窗
│   │   │   ├── 🧭 NavButton.jsx           # 导航按钮组件
│   │   │   └── 🔧 ChangeSign.jsx          # 个性签名修改组件
│   │   │
│   │   └── 🎨 styles/                     # 样式文件
│   │       └── 🎨 friendsStyles.js        # 好友页面样式
│   │
│   └── 🛠️ utils/                          # ⭐ 核心工具库
│       ├── 🔐 encryption.js               # ⭐ 端到端加密管理器(核心)
│       ├── 🎭 steganography.js            # ⭐ 图片隐写术实现(核心)
│       ├── 🌐 api.js                      # ⭐ API接口封装(核心)
│       ├── 👤 avatarUtils.js              # ⭐ 头像统一管理(核心)
│       └── 🔌 globalSocket.js             # ⭐ 全局Socket管理(核心)
│
└── ⚙️ backend/                            # 后端核心文件
    ├── 📄 package.json                    # 后端依赖配置
    ├── 🎯 server.js                       # ⭐ 主服务器文件(核心)
    ├── 🗄️ server.db                       # SQLite数据库文件
    ├── 🗄️ init-db.js                      # 数据库初始化脚本
    ├── 👥 init_test_users.js              # 测试用户初始化
    ├── 🚀 start.bat                       # Windows启动脚本
    ├── 🚀 start.sh                        # Linux启动脚本
    │
    ├── 📁 imgs/                           # 头像图片资源(保留少量示例)
    │   ├── 🖼️ 1.jpg
    │   ├── 🖼️ 2.jpg
    │   ├── 🖼️ 3.jpg
    │   └── ... (其他头像图片)
    │
    └── 📁 ServerService/                  # 后端服务模块
        ├── 🗄️ Database.py                 # 数据库操作模块
        └── 🔄 Survival.py                 # 服务存活检测模块
```

## 🎯 核心文件说明

### ⭐ 关键核心文件 (系统核心功能)

#### 前端核心
- **`utils/encryption.js`** - 端到端加密管理器，RSA+AES+隐写术集成
- **`utils/steganography.js`** - 图片隐写术实现，Canvas API基础
- **`utils/api.js`** - API接口封装，前后端通信
- **`utils/avatarUtils.js`** - 头像统一管理，确保UI一致性
- **`utils/globalSocket.js`** - 全局Socket管理，实时消息推送
- **`pages/ChatPage.jsx`** - 聊天页面，消息发送接收核心逻辑
- **`pages/FriendsPage_fixed.jsx`** - 好友管理页面
- **`components/ChatListPage.jsx`** - 聊天列表，最近对话管理
- **`components/VideoBubble.jsx`** - 消息气泡组件，支持多媒体显示

#### 后端核心
- **`server.js`** - Node.js主服务器，WebSocket+API+加密支持
- **`server.db`** - SQLite数据库，存储用户、消息、密钥等
- **`init-db.js`** - 数据库结构初始化
- **`ServerService/Database.py`** - Python数据库操作模块
- **`ServerService/Survival.py`** - 服务监控模块

#### 系统文档
- **`E2E_ENCRYPTION_GUIDE.md`** - 端到端加密系统完整说明
- **`CHATLIST_FEATURES.md`** - ChatList功能实现详情
- **`BUGFIX_VERIFICATION.md`** - 修复问题验证清单

### 🔧 重要支撑文件

#### 应用入口
- **`frontend/main.jsx`** - React应用启动入口
- **`frontend/App.jsx`** - 主路由和状态管理
- **`frontend/index.html`** - HTML入口文件

#### 配置文件
- **`frontend/package.json`** - 前端依赖：React、crypto-js、jsencrypt等
- **`backend/package.json`** - 后端依赖：Express、Socket.io、SQLite3等
- **`frontend/vite.config.js`** - 前端构建配置

#### 启动脚本
- **`start_system.bat`** - 一键启动前后端服务
- **`backend/start.bat`** - 后端服务启动
- **`backend/start.sh`** - Linux后端启动

### 📋 已排除的文件类型

#### 环境与构建文件
- `.env`, `.env.example` - 环境变量配置
- `package-lock.json`, `bun.lock` - 包管理锁定文件
- `.gitignore` - Git忽略配置
- `biome.json`, `eslint.config.js` - 代码格式化配置
- `netlify.toml` - 部署配置

#### 测试文件
- `test_*.js`, `test_*.py`, `test_*.html` - 各种测试脚本
- `verification-test.html` - 验证测试页面
- `simple_test.js` - 简单测试脚本

#### 重复/废弃文件
- `server - 副本.db` - 数据库备份
- `message.db` - 旧数据库文件
- `backend/imgs/4.jpg ~ 100.jpg` - 大量重复头像(保留少量示例)
- `frontend/public/picture/4.png ~ 10.jpg` - 重复示例图片
- `FriendsPage.jsx` - 已被 `FriendsPage_fixed.jsx` 替代

#### 开发工具文件
- `__pycache__/` - Python编译缓存
- Python测试脚本如 `windows_11.py`, `test.py` 等
- 邮件测试脚本 `send_email.py`, `test_email.py`

#### 其他工具文件
- `check-db.js` - 数据库检查工具
- `install-*.bat` - 安装脚本
- 各种页面测试Python文件

## 📊 核心文件统计

- **总核心文件数**: ~35个文件
- **前端核心文件**: ~20个
- **后端核心文件**: ~8个  
- **文档文件**: ~4个
- **配置/启动文件**: ~3个

## 🎯 使用建议

1. **开发时重点关注**: ⭐ 标记的核心文件
2. **部署时必需**: 所有核心文件 + 配置文件
3. **学习参考**: 从 `E2E_ENCRYPTION_GUIDE.md` 开始
4. **问题排查**: 参考 `BUGFIX_VERIFICATION.md`
5. **功能扩展**: 基于现有核心组件进行扩展

本文件树确保了系统的完整性，同时去除了冗余，便于理解和维护。
