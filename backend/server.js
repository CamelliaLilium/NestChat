// simple-server.js - 大学作业用的超简单服务器
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 添加SQLite数据库支持
let Database;
let db;

try {
  // 尝试加载better-sqlite3，如果没有安装则使用内存存储
  Database = require('better-sqlite3');
  
  // 初始化数据库
  const dbPath = path.join(__dirname, 'server.db');
  db = new Database(dbPath);
  
  // 创建表（如果不存在）
  db.exec(`
    CREATE TABLE IF NOT EXISTS UserTable (
      email VARCHAR(64) PRIMARY KEY,
      username VARCHAR(32) NOT NULL,
      pwdhash CHAR(64) NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS FriendTable (
      email1 VARCHAR(64),
      email2 VARCHAR(64),
      PRIMARY KEY (email1, email2),
      FOREIGN KEY (email1) REFERENCES UserTable(email),
      FOREIGN KEY (email2) REFERENCES UserTable(email)
    );
    
    CREATE TABLE IF NOT EXISTS FriendRequest (
      inviter VARCHAR(64),
      invitee VARCHAR(64),
      request_time REAL NOT NULL,
      PRIMARY KEY (inviter, invitee),
      FOREIGN KEY (inviter) REFERENCES UserTable(email),
      FOREIGN KEY (invitee) REFERENCES UserTable(email)
    );
    
    CREATE TABLE IF NOT EXISTS MessageTable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender VARCHAR(64) NOT NULL,
      receiver VARCHAR(64) NOT NULL,
      content TEXT NOT NULL,
      timestamp REAL NOT NULL,
      FOREIGN KEY (sender) REFERENCES UserTable(email),
      FOREIGN KEY (receiver) REFERENCES UserTable(email)
    );
  `);
  
  console.log('✅ 数据库连接成功');
} catch (error) {
  console.log('⚠️  未安装better-sqlite3，使用内存存储模式');
  console.log('   要启用数据库功能，请运行: npm install better-sqlite3');
  Database = null;
  db = null;
}

// 基础配置
app.use(cors());
app.use(express.json());

// 健康检查端点
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Chat APP 后端服务器运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API健康检查
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'chat-app-backend',
    users_count: users.length,
    online_users: onlineUsers.size,
    messages_count: messages.length
  });
});

// 数据库操作函数
const dbOperations = {
  // 用户相关操作
  findUser: (email) => {
    if (!db) return null;
    try {
      const stmt = db.prepare('SELECT * FROM UserTable WHERE email = ?');
      return stmt.get(email);
    } catch (error) {
      console.error('查找用户失败:', error);
      return null;
    }
  },
  
  createUser: (email, username, password) => {
    if (!db) return false;
    try {
      const pwdhash = crypto.createHash('sha256').update(password).digest('hex');
      const stmt = db.prepare('INSERT INTO UserTable (email, username, pwdhash) VALUES (?, ?, ?)');
      stmt.run(email, username, pwdhash);
      return true;
    } catch (error) {
      console.error('创建用户失败:', error);
      return false;
    }
  },
  
  verifyPassword: (email, password) => {
    if (!db) return false;
    try {
      const pwdhash = crypto.createHash('sha256').update(password).digest('hex');
      const stmt = db.prepare('SELECT * FROM UserTable WHERE email = ? AND pwdhash = ?');
      return stmt.get(email, pwdhash) !== undefined;
    } catch (error) {
      console.error('验证密码失败:', error);
      return false;
    }
  },
  
  // 好友相关操作
  addFriend: (email1, email2) => {
    if (!db) return false;
    try {
      const stmt = db.prepare('INSERT OR IGNORE INTO FriendTable (email1, email2) VALUES (?, ?), (?, ?)');
      stmt.run(email1, email2, email2, email1);
      return true;
    } catch (error) {
      console.error('添加好友失败:', error);
      return false;
    }
  },
  
  getFriends: (email) => {
    if (!db) return [];
    try {
      const stmt = db.prepare(`
        SELECT u.email, u.username 
        FROM UserTable u 
        INNER JOIN FriendTable f ON u.email = f.email2 
        WHERE f.email1 = ?
      `);
      return stmt.all(email);
    } catch (error) {
      console.error('获取好友列表失败:', error);
      return [];
    }
  },
  
  // 好友请求相关操作
  createFriendRequest: (inviter, invitee) => {
    if (!db) return false;
    try {
      const stmt = db.prepare('INSERT OR IGNORE INTO FriendRequest (inviter, invitee, request_time) VALUES (?, ?, ?)');
      stmt.run(inviter, invitee, Date.now() / 1000);
      return true;
    } catch (error) {
      console.error('创建好友请求失败:', error);
      return false;
    }
  },
  
  getFriendRequests: (email) => {
    if (!db) return [];
    try {
      const stmt = db.prepare(`
        SELECT u.email, u.username, fr.request_time
        FROM FriendRequest fr
        INNER JOIN UserTable u ON fr.inviter = u.email
        WHERE fr.invitee = ?
      `);
      return stmt.all(email);
    } catch (error) {
      console.error('获取好友请求失败:', error);
      return [];
    }
  },
  
  deleteFriendRequest: (inviter, invitee) => {
    if (!db) return false;
    try {
      const stmt = db.prepare('DELETE FROM FriendRequest WHERE inviter = ? AND invitee = ?');
      stmt.run(inviter, invitee);
      return true;
    } catch (error) {
      console.error('删除好友请求失败:', error);
      return false;
    }
  },
  
  // 消息相关操作
  saveMessage: (sender, receiver, content) => {
    if (!db) return false;
    try {
      const stmt = db.prepare('INSERT INTO MessageTable (sender, receiver, content, timestamp) VALUES (?, ?, ?, ?)');
      stmt.run(sender, receiver, content, Date.now() / 1000);
      return true;
    } catch (error) {
      console.error('保存消息失败:', error);
      return false;
    }
  },
  
  getMessages: (user1, user2, limit = 50) => {
    if (!db) return [];
    try {
      const stmt = db.prepare(`
        SELECT * FROM MessageTable 
        WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
        ORDER BY timestamp DESC LIMIT ?
      `);
      return stmt.all(user1, user2, user2, user1, limit).reverse();
    } catch (error) {
      console.error('获取消息失败:', error);
      return [];
    }
  }
};

// 内存数据存储（当数据库不可用时使用）
let users = [
  { email: 'alice@test.com', username: 'Alice', password: '123456' },
  { email: 'bob@test.com', username: 'Bob', password: '123456' }
];
let messages = [];
let onlineUsers = new Set();

// ====================== 认证API ======================
// 登录接口
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  console.log('登录请求:', { email, password });
  
  // 使用数据库或内存存储
  let user = null;
  if (db) {
    // 数据库模式
    const dbUser = dbOperations.findUser(email);
    if (dbUser && dbOperations.verifyPassword(email, password)) {
      user = dbUser;
    }
  } else {
    // 内存模式
    user = users.find(u => u.email === email && u.password === password);
  }
  
  if (user) {
    onlineUsers.add(user.email);
    res.json({ 
      success: true,
      token: `fake-token-${user.email}`, 
      user: { 
        email: user.email, 
        name: user.username,
        username: user.username 
      }
    });
  } else {
    res.status(401).json({ 
      success: false,
      error: '邮箱或密码错误',
      message: '邮箱或密码错误'
    });
  }
});

// 注册接口
app.post('/api/v1/auth/register', (req, res) => {
  const { email, name, password, verificationCode } = req.body;
  console.log('注册请求:', { email, name, password, verificationCode });

  // 验证必填字段
  if (!email || !name || !password || !verificationCode) {
    return res.status(400).json({ 
      success: false,
      error: '所有字段都是必填的' 
    });
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false,
      error: '邮箱格式不正确' 
    });
  }

  // 验证密码长度
  if (password.length < 6) {
    return res.status(400).json({ 
      success: false,
      error: '密码长度至少6位' 
    });
  }

  // 检查邮箱是否已存在
  let userExists = false;
  if (db) {
    // 数据库模式
    userExists = dbOperations.findUser(email) !== null;
  } else {
    // 内存模式
    userExists = users.find(u => u.email === email) !== undefined;
  }
  
  if (userExists) {
    return res.status(400).json({ 
      success: false,
      error: '该邮箱已被注册',
      code: 'USER_EXISTS'
    });
  }

  // 验证验证码
  const storedCodeData = verificationCodes.get(email);
  
  if (!storedCodeData) {
    return res.status(400).json({ 
      success: false,
      error: '验证码已过期或不存在，请重新获取',
      code: 'VCODE_EXPIRED'
    });
  }

  // 检查验证码是否过期（5分钟）
  const now = Date.now();
  if (now - storedCodeData.timestamp > 5 * 60 * 1000) {
    verificationCodes.delete(email);
    return res.status(400).json({ 
      success: false,
      error: '验证码已过期，请重新获取',
      code: 'VCODE_EXPIRED'
    });
  }

  // 验证验证码
  if (storedCodeData.code !== verificationCode) {
    return res.status(400).json({ 
      success: false,
      error: '验证码错误',
      code: 'VCODE_ERROR'
    });
  }

  // 验证码正确，创建新用户
  let success = false;
  if (db) {
    // 数据库模式
    success = dbOperations.createUser(email, name, password);
  } else {
    // 内存模式
    const newUser = {
      email,
      username: name,
      password
    };
    users.push(newUser);
    success = true;
  }
  
  if (!success) {
    return res.status(500).json({ 
      success: false,
      error: '注册失败，请稍后重试'
    });
  }
  
  // 删除已使用的验证码
  verificationCodes.delete(email);
  
  res.json({ 
    success: true,
    user: { 
      email, 
      name: name,
      username: name 
    },
    message: '注册成功'
  });
});

// 获取用户信息
app.get('/api/v1/users/profile', (req, res) => {
  // 简单从token解析用户ID
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = token ? parseInt(token.split('-').pop()) : null;
  
  const user = users.find(u => u.id === userId);
  if (user) {
    res.json({ user: { id: user.id, email: user.email, username: user.username } });
  } else {
    res.status(401).json({ error: '未授权' });
  }
});

// 获取所有用户列表
app.get('/api/v1/users', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = token ? parseInt(token.split('-').pop()) : null;
  
  // 返回除自己外的所有用户
  const userList = users
    .filter(u => u.id !== userId)
    .map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      status: onlineUsers.has(u.id) ? 'online' : 'offline'
    }));
  
  res.json({ users: userList });
});

// 搜索用户
app.get('/api/v1/users/search', (req, res) => {
  const { q } = req.query;
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = token ? parseInt(token.split('-').pop()) : null;
  
  if (!q) {
    return res.json({ users: [] });
  }
  
  const searchResults = users
    .filter(u => u.id !== userId && 
      (u.username.toLowerCase().includes(q.toLowerCase()) || 
       u.email.toLowerCase().includes(q.toLowerCase())))
    .map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      status: onlineUsers.has(u.id) ? 'online' : 'offline'
    }));
  
  res.json({ users: searchResults });
});

// ====================== 聊天API ======================
// 获取消息历史
app.get('/api/v1/chat/messages', (req, res) => {
  const { contact_id } = req.query;
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = token ? parseInt(token.split('-').pop()) : null;
  
  // 过滤出相关的聊天消息
  const chatMessages = messages.filter(msg => 
    (msg.sender_id === userId && msg.receiver_id === parseInt(contact_id)) ||
    (msg.sender_id === parseInt(contact_id) && msg.receiver_id === userId)
  );
  
  res.json({ messages: chatMessages });
});

// 发送消息
app.post('/api/v1/chat/messages', (req, res) => {
  const { receiver_id, content, type = 'text' } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  const sender_id = token ? parseInt(token.split('-').pop()) : null;
  
  const message = {
    id: Date.now(),
    sender_id,
    receiver_id: parseInt(receiver_id),
    content,
    type,
    timestamp: new Date().toISOString()
  };
  
  messages.push(message);
  
  // 通过WebSocket实时发送
  io.emit('new_message', message);
  
  res.json({ message });
});

// ====================== 好友API ======================
// 获取好友列表
app.get('/api/v1/friends', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = token ? parseInt(token.split('-').pop()) : null;
  
  // 简单返回除自己外的所有用户作为好友
  const friends = users
    .filter(u => u.id !== userId)
    .map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      status: onlineUsers.has(u.id) ? 'online' : 'offline'
    }));
  
  res.json({ friends });
});

// ====================== 视频通话API ======================
// 创建视频会话
app.post('/api/v1/video/sessions', (req, res) => {
  const { participant_id } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  const initiator_id = token ? parseInt(token.split('-').pop()) : null;
  
  const session = {
    id: `session_${Date.now()}`,
    initiator_id,
    participant_id: parseInt(participant_id),
    status: 'calling',
    created_at: new Date().toISOString()
  };
  
  // 通知被叫方
  io.emit('incoming_call', {
    session_id: session.id,
    caller_id: initiator_id,
    caller_name: users.find(u => u.id === initiator_id)?.username
  });
  
  res.json({ session });
});

// 更新会话状态
app.put('/api/v1/video/sessions/:sessionId/status', (req, res) => {
  const { status } = req.body;
  const sessionId = req.params.sessionId;
  
  // 通知相关用户
  io.emit('call_status_changed', {
    session_id: sessionId,
    status: status
  });
  
  res.json({ 
    session: { 
      id: sessionId, 
      status, 
      updated_at: new Date().toISOString() 
    } 
  });
});

// ====================== WebSocket处理 ======================
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 用户加入
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    socket.userId = userId;
    onlineUsers.add(parseInt(userId));
    console.log(`用户 ${userId} 加入房间`);
    
    // 广播用户上线状态
    socket.broadcast.emit('friend_status_change', {
      userId: parseInt(userId),
      status: 'online'
    });
  });

  // 实时发送消息
  socket.on('send_message', (data) => {
    console.log('收到实时消息:', data);
    
    const message = {
      id: Date.now(),
      sender_id: data.sender_id,
      receiver_id: data.receiver_id,
      content: data.content,
      type: data.type || 'text',
      timestamp: new Date().toISOString()
    };
    
    messages.push(message);
    
    // 发送给目标用户
    socket.to(`user_${data.receiver_id}`).emit('new_message', message);
    
    // 也发送给自己确认
    socket.emit('message_sent', message);
  });

  // 视频通话相关
  socket.on('call_initiated', (data) => {
    socket.to(`user_${data.participant_id}`).emit('call_initiated', data);
  });

  socket.on('call_accepted', (data) => {
    socket.to(`user_${data.caller_id}`).emit('call_accepted', data);
  });

  socket.on('call_rejected', (data) => {
    socket.to(`user_${data.caller_id}`).emit('call_rejected', data);
  });

  socket.on('video_frame', (data) => {
    socket.to(`user_${data.target_user_id}`).emit('video_frame', data);
  });

  // 断开连接
  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(parseInt(socket.userId));
      
      // 广播用户下线状态
      socket.broadcast.emit('friend_status_change', {
        userId: parseInt(socket.userId),
        status: 'offline'
      });
    }
    console.log('用户断开连接:', socket.id);
  });
});

// ====================== 启动服务器 ======================
const PORT = 3001;

server.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log('📋 测试账号:');
  console.log('   alice@test.com / 123456');
  console.log('   bob@test.com / 123456');
  console.log('');
  console.log('🔗 API端点:');
  console.log(`   POST http://localhost:${PORT}/api/v1/auth/login`);
  console.log(`   POST http://localhost:${PORT}/api/v1/auth/register`);
  console.log(`   POST http://localhost:${PORT}/api/v1/auth/send-code`);
  console.log(`   POST http://localhost:${PORT}/api/v1/auth/login-with-code`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/friends`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/chat/messages`);
  console.log(`   POST http://localhost:${PORT}/api/v1/chat/messages`);
  console.log('');
  console.log('🧪 使用前端应用测试:');
  console.log('   npm run dev  # 启动前端开发服务器');
  console.log('   然后访问注册页面测试验证码功能');
  console.log('');
  console.log('💡 验证码功能说明:');
  console.log('   - 验证码有效期: 5分钟');
  console.log('   - 最大尝试次数: 30次');
  console.log('   - 真实邮件发送: 通过Python脚本');
  console.log('   - 验证码格式: 6位字符（数字+大写字母）');
  console.log('');
  console.log('📧 邮件发送测试:');
  console.log('   python test_email.py  # 测试邮件发送功能');
  console.log('   python send_email.py <email> <code>  # 手动发送测试');
});

// ====================== 好友管理API ======================
// 获取好友列表
app.get('/api/v1/friends', (req, res) => {
  const userEmail = req.headers['user-email']; // 从请求头获取用户邮箱
  
  if (!userEmail) {
    return res.status(401).json({ 
      success: false,
      error: '未授权访问' 
    });
  }
  
  let friends = [];
  if (db) {
    friends = dbOperations.getFriends(userEmail);
  } else {
    // 内存模式下的简单实现
    friends = users.filter(u => u.email !== userEmail);
  }
  
  res.json({ 
    success: true,
    friends: friends
  });
});

// 发送好友请求
app.post('/api/v1/friends/request', (req, res) => {
  const { friendEmail } = req.body;
  const userEmail = req.headers['user-email'];
  
  if (!userEmail || !friendEmail) {
    return res.status(400).json({ 
      success: false,
      error: '参数不完整' 
    });
  }
  
  if (userEmail === friendEmail) {
    return res.status(400).json({ 
      success: false,
      error: '不能添加自己为好友' 
    });
  }
  
  // 检查目标用户是否存在
  let targetUser = null;
  if (db) {
    targetUser = dbOperations.findUser(friendEmail);
  } else {
    targetUser = users.find(u => u.email === friendEmail);
  }
  
  if (!targetUser) {
    return res.status(404).json({ 
      success: false,
      error: '用户不存在' 
    });
  }
  
  // 创建好友请求
  let success = false;
  if (db) {
    success = dbOperations.createFriendRequest(userEmail, friendEmail);
  } else {
    // 内存模式下直接添加为好友
    success = true;
  }
  
  if (success) {
    res.json({ 
      success: true,
      message: '好友请求已发送' 
    });
  } else {
    res.status(500).json({ 
      success: false,
      error: '发送好友请求失败' 
    });
  }
});

// 获取好友请求
app.get('/api/v1/friends/requests', (req, res) => {
  const userEmail = req.headers['user-email'];
  
  if (!userEmail) {
    return res.status(401).json({ 
      success: false,
      error: '未授权访问' 
    });
  }
  
  let requests = [];
  if (db) {
    requests = dbOperations.getFriendRequests(userEmail);
  }
  
  res.json({ 
    success: true,
    requests: requests
  });
});

// 接受好友请求
app.post('/api/v1/friends/accept', (req, res) => {
  const { friendEmail } = req.body;
  const userEmail = req.headers['user-email'];
  
  if (!userEmail || !friendEmail) {
    return res.status(400).json({ 
      success: false,
      error: '参数不完整' 
    });
  }
  
  let success = false;
  if (db) {
    // 添加好友关系
    success = dbOperations.addFriend(userEmail, friendEmail);
    if (success) {
      // 删除好友请求
      dbOperations.deleteFriendRequest(friendEmail, userEmail);
    }
  } else {
    success = true;
  }
  
  if (success) {
    res.json({ 
      success: true,
      message: '已接受好友请求' 
    });
  } else {
    res.status(500).json({ 
      success: false,
      error: '接受好友请求失败' 
    });
  }
});

// 拒绝好友请求
app.post('/api/v1/friends/reject', (req, res) => {
  const { friendEmail } = req.body;
  const userEmail = req.headers['user-email'];
  
  if (!userEmail || !friendEmail) {
    return res.status(400).json({ 
      success: false,
      error: '参数不完整' 
    });
  }
  
  let success = false;
  if (db) {
    success = dbOperations.deleteFriendRequest(friendEmail, userEmail);
  } else {
    success = true;
  }
  
  if (success) {
    res.json({ 
      success: true,
      message: '已拒绝好友请求' 
    });
  } else {
    res.status(500).json({ 
      success: false,
      error: '拒绝好友请求失败' 
    });
  }
});

// ====================== 消息API ======================
// 获取聊天记录
app.get('/api/v1/messages/:friendEmail', (req, res) => {
  const { friendEmail } = req.params;
  const userEmail = req.headers['user-email'];
  
  if (!userEmail) {
    return res.status(401).json({ 
      success: false,
      error: '未授权访问' 
    });
  }
  
  let messages = [];
  if (db) {
    messages = dbOperations.getMessages(userEmail, friendEmail);
  }
  
  res.json({ 
    success: true,
    messages: messages
  });
});

// 发送消息
app.post('/api/v1/messages', (req, res) => {
  const { receiverEmail, content } = req.body;
  const senderEmail = req.headers['user-email'];
  
  if (!senderEmail || !receiverEmail || !content) {
    return res.status(400).json({ 
      success: false,
      error: '参数不完整' 
    });
  }
  
  let success = false;
  if (db) {
    success = dbOperations.saveMessage(senderEmail, receiverEmail, content);
  } else {
    // 内存模式
    messages.push({
      sender: senderEmail,
      receiver: receiverEmail,
      content: content,
      timestamp: Date.now() / 1000
    });
    success = true;
  }
  
  if (success) {
    res.json({ 
      success: true,
      message: '消息发送成功' 
    });
    
    // 通过Socket.IO广播消息给在线用户
    io.emit('new_message', {
      sender: senderEmail,
      receiver: receiverEmail,
      content: content,
      timestamp: Date.now()
    });
  } else {
    res.status(500).json({ 
      success: false,
      error: '消息发送失败' 
    });
  }
});

// 内存存储验证码（生产环境应使用Redis等）
let verificationCodes = new Map();

// 发送验证码接口
app.post('/api/v1/auth/send-code', async (req, res) => {
  const { email } = req.body;
  console.log('发送验证码请求:', { email });

  if (!email) {
    return res.status(400).json({ 
      success: false,
      error: '邮箱不能为空' 
    });
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false,
      error: '邮箱格式不正确' 
    });
  }

  // 生成6位验证码（与Python后端格式一致）
  const code = Array.from({length: 6}, () => 
    '23456789QWERTYUPASDFGHJKZXCVBNM98765432'[Math.floor(Math.random() * 38)]
  ).join('');
  
  // 存储验证码（5分钟有效期）
  verificationCodes.set(email, {
    code: code,
    timestamp: Date.now(),
    attempts: 0
  });

  // 设置5分钟后自动删除验证码
  setTimeout(() => {
    verificationCodes.delete(email);
  }, 5 * 60 * 1000);

  console.log(`为 ${email} 生成验证码: ${code}`);

  // 调用Python脚本发送真实邮件
  try {
    const pythonProcess = spawn('python', ['send_email.py', email, code], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code_exit) => {
      if (code_exit === 0) {
        try {
          const result = JSON.parse(output.trim());
          if (result.success) {
            console.log(`✅ 验证码邮件发送成功: ${email}`);
            res.json({ 
              success: true,
              message: '验证码已发送到您的邮箱',
              // 开发环境下返回验证码便于测试
              dev_code: code
            });
          } else {
            console.error(`❌ Python脚本返回错误: ${result.error}`);
            res.status(500).json({ 
              success: false,
              error: result.error || '邮件发送失败' 
            });
          }
        } catch (parseError) {
          console.error(`❌ 解析Python输出失败: ${parseError.message}`);
          console.error(`Python输出: ${output}`);
          res.status(500).json({ 
            success: false,
            error: '邮件服务响应格式错误' 
          });
        }
      } else {
        console.error(`❌ Python脚本执行失败，退出码: ${code_exit}`);
        console.error(`错误输出: ${errorOutput}`);
        res.status(500).json({ 
          success: false,
          error: '邮件发送服务不可用' 
        });
      }
    });

    pythonProcess.on('error', (error) => {
      console.error(`❌ 启动Python脚本失败: ${error.message}`);
      res.status(500).json({ 
        success: false,
        error: '邮件发送服务启动失败，请确保已安装Python' 
      });
    });

  } catch (error) {
    console.error(`❌ 调用邮件发送服务失败: ${error.message}`);
    res.status(500).json({ 
      success: false,
      error: '邮件发送服务异常' 
    });
  }
});

// 验证码登录接口
app.post('/api/v1/auth/login-with-code', (req, res) => {
  const { email, code } = req.body;
  console.log('验证码登录请求:', { email, code });

  if (!email || !code) {
    return res.status(400).json({ 
      success: false,
      error: '邮箱和验证码不能为空' 
    });
  }

  const storedCodeData = verificationCodes.get(email);
  
  if (!storedCodeData) {
    return res.status(400).json({ 
      success: false,
      error: '验证码已过期或不存在，请重新获取' 
    });
  }

  // 检查验证码是否过期（5分钟）
  const now = Date.now();
  if (now - storedCodeData.timestamp > 5 * 60 * 1000) {
    verificationCodes.delete(email);
    return res.status(400).json({ 
      success: false,
      error: '验证码已过期，请重新获取' 
    });
  }

  // 检查尝试次数（最多30次）
  if (storedCodeData.attempts >= 30) {
    verificationCodes.delete(email);
    return res.status(400).json({ 
      success: false,
      error: '验证码尝试次数过多，请重新获取' 
    });
  }

  // 验证验证码
  if (storedCodeData.code !== code) {
    storedCodeData.attempts++;
    return res.status(400).json({ 
      success: false,
      error: '验证码错误' 
    });
  }

  // 验证码正确，查找用户
  let user = null;
  if (db) {
    // 数据库模式
    user = dbOperations.findUser(email);
  } else {
    // 内存模式
    user = users.find(u => u.email === email);
  }
  
  if (!user) {
    verificationCodes.delete(email);
    return res.status(400).json({ 
      success: false,
      error: '用户不存在，请先注册' 
    });
  }

  // 登录成功
  verificationCodes.delete(email);
  onlineUsers.add(user.email);
  
  res.json({ 
    success: true,
    token: `fake-token-${user.email}`, 
    user: { 
      email: user.email, 
      name: user.username,
      username: user.username 
    }
  });
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 服务器关闭中...');
  if (db) {
    db.close();
    console.log('📁 数据库连接已关闭');
  }
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});