const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { spawn } = require('child_process');
const sqlite3 = require('sqlite3').verbose();
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

// 基础配置
app.use(cors());
app.use(express.json());

// 数据库连接
const dbPath = path.join(__dirname, 'server.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('✅ 数据库连接成功');
    // 初始化数据库表
    initializeDatabase();
  }
});

// 初始化数据库表
function initializeDatabase() {
  // 创建用户表
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS UserTable (
        email VARCHAR(64) PRIMARY KEY,
        username VARCHAR(32) NOT NULL,
        pwdhash CHAR(64) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS FriendTable (
        email1 VARCHAR(64),
        email2 VARCHAR(64),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (email1, email2),
        FOREIGN KEY (email1) REFERENCES UserTable(email),
        FOREIGN KEY (email2) REFERENCES UserTable(email)
      )
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS FriendRequest (
        inviter VARCHAR(64),
        invitee VARCHAR(64),
        request_time REAL NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (inviter, invitee),
        FOREIGN KEY (inviter) REFERENCES UserTable(email),
        FOREIGN KEY (invitee) REFERENCES UserTable(email)
      )
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS MessageTable (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender VARCHAR(64) NOT NULL,
        receiver VARCHAR(64) NOT NULL,
        content TEXT NOT NULL,
        timestamp REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender) REFERENCES UserTable(email),
        FOREIGN KEY (receiver) REFERENCES UserTable(email)
      )
    `);
    
    console.log('✅ 数据库表初始化完成');
  });
}

// 工具函数：生成密码哈希
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 工具函数：从数据库获取用户
function getUserFromDb(email, callback) {
  db.get('SELECT * FROM UserTable WHERE email = ?', [email], callback);
}

// 工具函数：创建新用户
function createUser(email, username, password, callback) {
  const pwdhash = hashPassword(password);
  db.run(
    'INSERT INTO UserTable (email, username, pwdhash) VALUES (?, ?, ?)',
    [email, username, pwdhash],
    callback
  );
}

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
  // 从数据库获取用户数量
  db.get('SELECT COUNT(*) as count FROM UserTable', (err, result) => {
    const userCount = err ? 0 : result.count;
    res.json({
      status: 'healthy',
      service: 'chat-app-backend',
      users_count: userCount,
      online_users: onlineUsers.size,
      messages_count: messages.length
    });
  });
});

// 内存数据存储（临时数据）
let messages = [];
let onlineUsers = new Set();
let friendRequests = []; // 存储好友请求
let friendships = []; // 存储好友关系

// 验证码存储（临时）
let verificationCodes = new Map();

// ====================== 认证API ======================
// 登录接口
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  console.log('登录请求:', { email, password });
  
  // 从数据库查找用户
  getUserFromDb(email, (err, user) => {
    if (err) {
      console.error('数据库查询错误:', err);
      return res.status(500).json({ 
        success: false,
        error: '服务器内部错误' 
      });
    }
    
    if (user && user.pwdhash === hashPassword(password)) {
      // 登录成功
      const userId = user.email; // 使用email作为用户ID
      onlineUsers.add(userId);
      res.json({ 
        success: true,
        token: `fake-token-${Date.now()}`, 
        user: { 
          id: userId, 
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
  getUserFromDb(email, (err, existingUser) => {
    if (err) {
      console.error('数据库查询错误:', err);
      return res.status(500).json({ 
        success: false,
        error: '服务器内部错误' 
      });
    }
    
    if (existingUser) {
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
    createUser(email, name, password, function(err) {
      if (err) {
        console.error('创建用户失败:', err);
        return res.status(500).json({ 
          success: false,
          error: '注册失败，请重试' 
        });
      }
      
      // 删除已使用的验证码
      verificationCodes.delete(email);
      
      console.log('用户注册成功:', { email, name });
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
  });
});

// 获取用户信息
app.get('/api/v1/users/profile', (req, res) => {
  // 简单从token解析用户邮箱
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userEmail = req.headers['user-email']; // 从header获取用户邮箱
  
  if (!userEmail) {
    return res.status(401).json({ error: '未授权' });
  }
  
  getUserFromDb(userEmail, (err, user) => {
    if (err) {
      console.error('数据库查询错误:', err);
      return res.status(500).json({ error: '服务器内部错误' });
    }
    
    if (user) {
      res.json({ 
        user: { 
          email: user.email, 
          username: user.username,
          name: user.username
        } 
      });
    } else {
      res.status(401).json({ error: '用户不存在' });
    }
  });
});

// 获取所有用户列表（查数据库）
app.get('/api/v1/users', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userEmail = req.headers['user-email'];
  let currentUserEmail = userEmail || null;
  db.all('SELECT email, username FROM UserTable', [], (err, rows) => {
    if (err) {
      console.error('查询用户列表失败:', err);
      return res.status(500).json({ error: '服务器内部错误' });
    }
    // 过滤掉自己
    const userList = rows
      .filter(u => u.email !== currentUserEmail)
      .map(u => ({
        id: u.email, // 用email做唯一ID
        name: u.username,
        username: u.username,
        email: u.email,
        status: onlineUsers.has(u.email) ? 'online' : 'offline'
      }));
    res.json({ users: userList });
  });
});

// 搜索用户（查数据库）
app.get('/api/v1/users/search', (req, res) => {
  const { q } = req.query;
  const userEmail = req.headers['user-email'];
  if (!q) {
    return res.json({ users: [] });
  }
  db.all(
    'SELECT email, username FROM UserTable WHERE username LIKE ? OR email LIKE ?',
    [`%${q}%`, `%${q}%`],
    (err, rows) => {
      if (err) {
        console.error('搜索用户失败:', err);
        return res.status(500).json({ error: '服务器内部错误' });
      }
      // 过滤掉自己
      const userList = rows
        .filter(u => u.email !== userEmail)
        .map(u => ({
          id: u.email,
          name: u.username,
          username: u.username,
          email: u.email,
          status: onlineUsers.has(u.email) ? 'online' : 'offline'
        }));
      res.json({ users: userList });
    }
  );
});

// ====================== 聊天API ======================
// 获取消息历史（返回图片密文）
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

// 发送消息（图片隐写，image_jpg_base64字段）
app.post('/api/v1/chat/messages', (req, res) => {
  const { receiver_id, image_jpg_base64, type = 'image_stego' } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  const sender_id = token ? parseInt(token.split('-').pop()) : null;

  if (!image_jpg_base64) {
    return res.status(400).json({ error: '缺少图片数据' });
  }

  const message = {
    id: Date.now(),
    sender_id,
    receiver_id: parseInt(receiver_id),
    image_jpg_base64, // base64字符串，内容为jpg隐写图片
    type,
    timestamp: new Date().toISOString()
  };

  messages.push(message);

  // 通过WebSocket实时发送
  io.emit('new_message', message);

  res.json({ message });
});

// ====================== 好友API ======================
// 获取好友列表（查数据库 FriendTable）
app.get('/api/v1/friends', (req, res) => {
  const userEmail = req.headers['user-email'];
  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }
  // 查找所有与当前用户有关的好友关系
  db.all(
    'SELECT email1, email2 FROM FriendTable WHERE email1 = ? OR email2 = ?',
    [userEmail, userEmail],
    (err, rows) => {
      if (err) {
        console.error('查询好友列表失败:', err);
        return res.status(500).json({ error: '服务器内部错误' });
      }
      // 获取所有好友邮箱
      const friendEmails = rows.map(r => (r.email1 === userEmail ? r.email2 : r.email1));
      if (friendEmails.length === 0) {
        return res.json({ friends: [] });
      }
      // 查询好友详细信息
      const placeholders = friendEmails.map(() => '?').join(',');
      db.all(
        `SELECT email, username FROM UserTable WHERE email IN (${placeholders})`,
        friendEmails,
        (err2, users) => {
          if (err2) {
            console.error('查询好友信息失败:', err2);
            return res.status(500).json({ error: '服务器内部错误' });
          }
          const friends = users.map(u => ({
            id: u.email,
            name: u.username,
            username: u.username,
            email: u.email,
            status: onlineUsers.has(u.email) ? 'online' : 'offline'
          }));
          res.json({ friends });
        }
      );
    }
  );
});

// 发送好友请求
app.post('/api/v1/friends/request', (req, res) => {
  const { email } = req.body;
  const userEmail = req.headers['user-email'];
  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }
  if (!email) {
    return res.status(400).json({ error: '缺少目标用户邮箱' });
  }
  // 查数据库获取用户信息
  db.get('SELECT email, username FROM UserTable WHERE email = ?', [userEmail], (err, fromUser) => {
    if (err || !fromUser) {
      return res.status(404).json({ error: '用户不存在' });
    }
    db.get('SELECT email, username FROM UserTable WHERE email = ?', [email], (err2, toUser) => {
      if (err2 || !toUser) {
        return res.status(404).json({ error: '目标用户不存在' });
      }
      if (fromUser.email === toUser.email) {
        return res.status(400).json({ error: '不能给自己发送好友请求' });
      }
      // 检查是否已经有待处理的请求（内存）
      const existingRequest = friendRequests.find(r =>
        r.fromUserId === fromUser.email && r.toUserId === toUser.email && r.status === 'pending'
      );
      if (existingRequest) {
        return res.status(400).json({ error: '已经发送过好友请求' });
      }
      // 检查是否已经是好友（数据库FriendTable）
      db.get('SELECT * FROM FriendTable WHERE (email1 = ? AND email2 = ?) OR (email1 = ? AND email2 = ?)',
        [fromUser.email, toUser.email, toUser.email, fromUser.email], (err3, friendRow) => {
        if (friendRow) {
          return res.status(400).json({ error: '已经是好友关系' });
        }
        // 创建好友请求（内存）
        const request = {
          id: `req_${Date.now()}_${fromUser.email}_${toUser.email}`,
          fromUserId: fromUser.email,
          toUserId: toUser.email,
          status: 'pending',
          requestTime: Date.now()
        };
        friendRequests.push(request);
        // 通知目标用户
        io.emit('friend_request', {
          request_id: request.id,
          from: {
            id: fromUser.email,
            name: fromUser.username,
            email: fromUser.email
          },
          to: {
            id: toUser.email,
            name: toUser.username,
            email: toUser.email
          }
        });
        res.json({ message: '好友请求已发送', request });
      });
    });
  });
});

// 获取收到的好友请求
app.get('/api/v1/friends/requests', (req, res) => {
  const userEmail = req.headers['user-email'];
  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }
  // 获取发给当前用户的待处理请求
  const requests = friendRequests
    .filter(r => r.toUserId === userEmail && r.status === 'pending');
  if (requests.length === 0) {
    return res.json({ requests: [] });
  }
  // 批量查找fromUser信息
  const fromEmails = requests.map(r => r.fromUserId);
  const placeholders = fromEmails.map(() => '?').join(',');
  db.all(`SELECT email, username FROM UserTable WHERE email IN (${placeholders})`, fromEmails, (err, users) => {
    if (err) {
      return res.status(500).json({ error: '服务器内部错误' });
    }
    const userMap = Object.fromEntries(users.map(u => [u.email, u]));
    const result = requests.map(r => {
      const fromUser = userMap[r.fromUserId] || { email: r.fromUserId, username: r.fromUserId };
      return {
        id: r.id,
        from: {
          id: fromUser.email,
          name: fromUser.username,
          email: fromUser.email
        },
        requestTime: r.requestTime,
        status: r.status
      };
    });
    res.json({ requests: result });
  });
});

// 接受好友请求
app.post('/api/v1/friends/requests/:inviterEmail/accept', (req, res) => {
  const { inviterEmail } = req.params;
  const userEmail = req.headers['user-email'];
  
  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }
  
  const currentUser = users.find(u => u.email === userEmail);
  const inviterUser = users.find(u => u.email === inviterEmail);
  
  if (!currentUser || !inviterUser) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  // 找到对应的好友请求
  const request = friendRequests.find(r => 
    r.fromUserId === inviterUser.id && 
    r.toUserId === currentUser.id && 
    r.status === 'pending'
  );
  
  if (!request) {
    return res.status(404).json({ error: '好友请求不存在或已处理' });
  }
  
  // 更新请求状态
  request.status = 'accepted';
  
  // 添加到好友关系
  const friendship = {
    id: `friend_${Date.now()}_${currentUser.id}_${inviterUser.id}`,
    userId1: currentUser.id,
    userId2: inviterUser.id,
    friendTime: Date.now()
  };
  
  friendships.push(friendship);
  
  // 通知双方
  io.emit('friend_request_accepted', {
    user1: {
      id: currentUser.id,
      name: currentUser.username,
      email: currentUser.email
    },
    user2: {
      id: inviterUser.id,
      name: inviterUser.username,
      email: inviterUser.email
    }
  });
  
  res.json({ message: '好友请求已接受' });
});

// 拒绝好友请求
app.post('/api/v1/friends/requests/:inviterEmail/reject', (req, res) => {
  const { inviterEmail } = req.params;
  const userEmail = req.headers['user-email'];
  
  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }
  
  const currentUser = users.find(u => u.email === userEmail);
  const inviterUser = users.find(u => u.email === inviterEmail);
  
  if (!currentUser || !inviterUser) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  // 找到对应的好友请求
  const request = friendRequests.find(r => 
    r.fromUserId === inviterUser.id && 
    r.toUserId === currentUser.id && 
    r.status === 'pending'
  );
  
  if (!request) {
    return res.status(404).json({ error: '好友请求不存在或已处理' });
  }
  
  // 更新请求状态
  request.status = 'rejected';
  
  res.json({ message: '好友请求已拒绝' });
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

  // 实时发送消息（图片隐写）
  socket.on('send_message', (data) => {
    console.log('收到实时消息:', data);
    if (!data.image_jpg_base64) {
      socket.emit('message_sent', { error: '缺少图片数据' });
      return;
    }
    const message = {
      id: Date.now(),
      sender_id: data.sender_id,
      receiver_id: data.receiver_id,
      image_jpg_base64: data.image_jpg_base64,
      type: data.type || 'image_stego',
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

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 服务器关闭中...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

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

  // 验证码正确，从数据库查找用户
  getUserFromDb(email, (err, user) => {
    if (err) {
      console.error('数据库查询错误:', err);
      verificationCodes.delete(email);
      return res.status(500).json({ 
        success: false,
        error: '服务器内部错误' 
      });
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
      token: `fake-token-${Date.now()}`, 
      user: { 
        email: user.email, 
        name: user.username,
        username: user.username 
      }
    });
  });
});