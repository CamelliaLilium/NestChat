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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 提供静态图片资源
app.use('/api/v1/images', express.static(path.join(__dirname, 'imgs')));

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
    
    db.run(`
      CREATE TABLE IF NOT EXISTS ImageTable (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender VARCHAR(64) NOT NULL,
        receiver VARCHAR(64) NOT NULL,
        image_data TEXT NOT NULL,
        timestamp REAL NOT NULL,
        file_name VARCHAR(255),
        file_size INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender) REFERENCES UserTable(email),
        FOREIGN KEY (receiver) REFERENCES UserTable(email)
      )
    `);

    // 创建 CurrentUsers 表用于记录用户在线状态
    db.run(`
      CREATE TABLE IF NOT EXISTS CurrentUsers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL UNIQUE,
        user_name TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        port_number INTEGER,
        login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        socket_id TEXT,
        user_agent TEXT,
        status TEXT DEFAULT 'online' CHECK (status IN ('online', 'away', 'busy')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引以提高查询性能
    db.run(`CREATE INDEX IF NOT EXISTS idx_current_users_email ON CurrentUsers(user_email)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_current_users_status ON CurrentUsers(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_current_users_last_activity ON CurrentUsers(last_activity)`);

    // 创建触发器，自动更新 updated_at 字段
    db.run(`
      CREATE TRIGGER IF NOT EXISTS update_current_users_timestamp 
        AFTER UPDATE ON CurrentUsers
      BEGIN
        UPDATE CurrentUsers 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = NEW.id;
      END;
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

// ====================== 在线状态管理工具函数 ======================

// 添加用户到在线列表
function addUserToOnlineList(userEmail, userName, ipAddress, portNumber, socketId, userAgent, callback) {
  db.run(
    'INSERT OR REPLACE INTO CurrentUsers ' +
    '(user_email, user_name, ip_address, port_number, socket_id, user_agent, login_time, last_activity) ' +
    'VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    [userEmail, userName, ipAddress, portNumber, socketId, userAgent],
    callback
  );
}

// 从在线列表移除用户
function removeUserFromOnlineList(userEmail, callback) {
  db.run('DELETE FROM CurrentUsers WHERE user_email = ?', [userEmail], callback);
}

// 更新用户活动时间
function updateUserActivity(userEmail, socketId, callback) {
  db.run(
    'UPDATE CurrentUsers SET last_activity = CURRENT_TIMESTAMP, socket_id = ? WHERE user_email = ?',
    [socketId, userEmail],
    callback
  );
}

// 获取用户的在线好友列表
function getUserOnlineFriends(userEmail, callback) {
  const query = 
    'SELECT cu.user_email, cu.user_name, cu.status, cu.last_activity, cu.login_time ' +
    'FROM CurrentUsers cu ' +
    'INNER JOIN FriendTable ft ON ' +
    '  (ft.email1 = ? AND ft.email2 = cu.user_email) OR ' +
    '  (ft.email2 = ? AND ft.email1 = cu.user_email) ' +
    'WHERE cu.user_email != ? AND cu.status = \'online\' ' +
    'ORDER BY cu.last_activity DESC';
  db.all(query, [userEmail, userEmail, userEmail], callback);
}

// 获取所有在线用户（管理员功能）
function getAllOnlineUsers(callback) {
  db.all(
    'SELECT user_email, user_name, status, last_activity, login_time FROM CurrentUsers WHERE status = "online"',
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
  
  // 获取客户端IP和用户代理信息
  const clientIp = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                   '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
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
      
      // 记录用户在线状态到数据库
      addUserToOnlineList(
        user.email, 
        user.username, 
        clientIp, 
        req.connection.localPort || 3001, 
        null, // Socket ID 将在Socket连接时更新
        userAgent,
        (dbErr) => {
          if (dbErr) {
            console.error('添加在线用户记录失败:', dbErr);
          } else {
            console.log('用户在线状态已记录:', user.email);
          }
        }
      );
      
      res.json({ 
        success: true,
        token: 'fake-token-' + Date.now(), 
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
    ['%' + q + '%', '%' + q + '%'],
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
// 获取消息历史（支持文本和隐写图片）
app.get('/api/v1/chat/messages', (req, res) => {
  const { contact_id } = req.query;
  const userEmail = req.headers['user-email'];

  if (!userEmail || !contact_id) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  // 从数据库查询消息历史
  db.all(
    'SELECT * FROM MessageTable ' +
    'WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?) ' +
    'ORDER BY timestamp ASC',
    [userEmail, contact_id, contact_id, userEmail],
    (err, rows) => {
      if (err) {
        console.error('查询消息失败:', err);
        return res.status(500).json({ error: '服务器内部错误' });
      }
      
      const chatMessages = rows.map(row => ({
        id: row.id,
        sender_id: row.sender,
        receiver_id: row.receiver,
        content: row.content,
        type: 'text', // 从数据库来的都是解密后的文本
        timestamp: new Date(row.timestamp * 1000).toISOString(),
        isOwn: row.sender === userEmail
      }));
      
      res.json({ messages: chatMessages });
    }
  );
});

// 发送消息（支持文本消息的加密隐写传输）
app.post('/api/v1/chat/messages', (req, res) => {
  const { receiver_id, content, type = 'text', encrypted_image } = req.body;
  const userEmail = req.headers['user-email'];

  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }

  if (!receiver_id || !content) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  // 检查是否为好友关系
  db.get(
    'SELECT * FROM FriendTable WHERE (email1 = ? AND email2 = ?) OR (email1 = ? AND email2 = ?)',
    [userEmail, receiver_id, receiver_id, userEmail],
    (err, friendship) => {
      if (err) {
        console.error('查询好友关系失败:', err);
        return res.status(500).json({ error: '服务器内部错误' });
      }
      
      if (!friendship) {
        return res.status(403).json({ error: '只能向好友发送消息' });
      }

      const timestamp = Date.now() / 1000; // Unix时间戳（秒）
      
      // 存储到数据库（存储明文，用于历史记录）
      db.run(
        'INSERT INTO MessageTable (sender, receiver, content, timestamp) VALUES (?, ?, ?, ?)',
        [userEmail, receiver_id, content, timestamp],
        function(err) {
          if (err) {
            console.error('存储消息失败:', err);
            return res.status(500).json({ error: '消息存储失败' });
          }

          const message = {
            id: this.lastID,
            sender_id: userEmail,
            receiver_id: receiver_id,
            content: content,
            type: type,
            timestamp: new Date(timestamp * 1000).toISOString(),
            isOwn: true,
            encrypted_image: encrypted_image // 加密隐写图片数据
          };

          // 通过WebSocket实时发送给接收方（发送加密图片）
          const receiverMessage = {
            ...message,
            isOwn: false
          };
          
          // 如果有加密图片，发送给接收方用于解密
          if (encrypted_image) {
            receiverMessage.encrypted_image = encrypted_image;
            console.log('📤 发送加密隐写消息给接收方');
          }
          
          io.to('user_' + receiver_id).emit('new_message', receiverMessage);
          
          // 发送给发送方确认（不包含加密图片）
          const senderConfirmation = {
            ...message,
            encrypted_image: undefined // 发送方不需要看到加密图片
          };
          io.to('user_' + userEmail).emit('message_sent', senderConfirmation);

          res.json({ message: senderConfirmation });
        }
      );
    }
  );
});

// 创建或获取聊天记录（用于发消息按钮）
app.post('/api/v1/chat/create', (req, res) => {
  const { contact_email } = req.body;
  const userEmail = req.headers['user-email'];

  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }

  if (!contact_email) {
    return res.status(400).json({ error: '缺少联系人邮箱' });
  }

  // 检查是否为好友关系
  db.get(
    'SELECT * FROM FriendTable WHERE (email1 = ? AND email2 = ?) OR (email1 = ? AND email2 = ?)',
    [userEmail, contact_email, contact_email, userEmail],
    (err, friendship) => {
      if (err) {
        console.error('查询好友关系失败:', err);
        return res.status(500).json({ error: '服务器内部错误' });
      }
      
      if (!friendship) {
        return res.status(403).json({ error: '只能与好友创建聊天' });
      }

      // 获取联系人信息
      db.get('SELECT email, username FROM UserTable WHERE email = ?', [contact_email], (err2, user) => {
        if (err2) {
          console.error('查询用户信息失败:', err2);
          return res.status(500).json({ error: '服务器内部错误' });
        }

        if (!user) {
          return res.status(404).json({ error: '用户不存在' });
        }

        // 返回聊天信息（即使没有消息历史）
        const chatInfo = {
          id: contact_email,
          email: contact_email,
          name: user.username,
          username: user.username,
          lastMessage: '',
          timestamp: new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
          rawTimestamp: Date.now() / 1000,
          unreadCount: 0,
          avatar: user.username.charAt(0).toUpperCase(),
          isOnline: onlineUsers.has(contact_email)
        };

        res.json({ chat: chatInfo });
      });
    }
  );
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
        'SELECT email, username FROM UserTable WHERE email IN (' + placeholders + ')',
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
      
      // 检查是否已经有待处理的请求（数据库）
      db.get(
        'SELECT * FROM FriendRequest WHERE inviter = ? AND invitee = ?',
        [fromUser.email, toUser.email],
        (err, existingRequest) => {
          if (err) {
            console.error('查询好友请求失败:', err);
            return res.status(500).json({ error: '服务器内部错误' });
          }
          
          if (existingRequest) {
            return res.status(400).json({ error: '已经发送过好友请求' });
          }
          
          // 检查是否已经是好友（数据库FriendTable）
          db.get(
            'SELECT * FROM FriendTable WHERE (email1 = ? AND email2 = ?) OR (email1 = ? AND email2 = ?)',
            [fromUser.email, toUser.email, toUser.email, fromUser.email],
            (err3, friendRow) => {
              if (err3) {
                console.error('查询好友关系失败:', err3);
                return res.status(500).json({ error: '服务器内部错误' });
              }
              
              if (friendRow) {
                return res.status(400).json({ error: '已经是好友关系' });
              }
              
              // 创建好友请求（数据库）
              const requestTime = Date.now();
              db.run(
                'INSERT INTO FriendRequest (inviter, invitee, request_time) VALUES (?, ?, ?)',
                [fromUser.email, toUser.email, requestTime],
                function(err) {
                  if (err) {
                    console.error('创建好友请求失败:', err);
                    return res.status(500).json({ error: '服务器内部错误' });
                  }
                  
                  // 通知目标用户
                  io.emit('friend_request', {
                    from: {
                      id: fromUser.email,
                      name: fromUser.username,
                      email: fromUser.email
                    },
                    to: {
                      id: toUser.email,
                      name: toUser.username,
                      email: toUser.email
                    },
                    requestTime: requestTime
                  });
                  
                  res.json({ message: '好友请求已发送' });
                }
              );
            }
          );
        }
      );
    });
  });
});

// 获取收到的好友请求
app.get('/api/v1/friends/requests', (req, res) => {
  const userEmail = req.headers['user-email'];
  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }
  
  // 从数据库获取发给当前用户的待处理请求
  db.all(
    `SELECT fr.inviter, fr.invitee, fr.request_time, u.username 
     FROM FriendRequest fr 
     JOIN UserTable u ON fr.inviter = u.email 
     WHERE fr.invitee = ?`,
    [userEmail],
    (err, requests) => {
      if (err) {
        console.error('获取好友请求失败:', err);
        return res.status(500).json({ error: '服务器内部错误' });
      }
      
      const result = requests.map(request => ({
        id: request.inviter, // 使用inviter的email作为id
        from: {
          id: request.inviter,
          name: request.username,
          email: request.inviter
        },
        requestTime: request.request_time,
        status: 'pending'
      }));
      
      res.json({ requests: result });
    }
  );
});

// 接受好友请求
app.post('/api/v1/friends/requests/:inviterEmail/accept', (req, res) => {
  const { inviterEmail } = req.params;
  const userEmail = req.headers['user-email'];
  
  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }
  
  // 检查好友请求是否存在
  db.get(
    'SELECT * FROM FriendRequest WHERE inviter = ? AND invitee = ?',
    [inviterEmail, userEmail],
    (err, request) => {
      if (err) {
        console.error('查询好友请求失败:', err);
        return res.status(500).json({ error: '服务器内部错误' });
      }
      
      if (!request) {
        return res.status(404).json({ error: '好友请求不存在' });
      }
      
      // 检查是否已经是好友
      db.get(
        'SELECT * FROM FriendTable WHERE (email1 = ? AND email2 = ?) OR (email1 = ? AND email2 = ?)',
        [inviterEmail, userEmail, userEmail, inviterEmail],
        (err, friendship) => {
          if (err) {
            console.error('查询好友关系失败:', err);
            return res.status(500).json({ error: '服务器内部错误' });
          }
          
          if (friendship) {
            return res.status(400).json({ error: '已经是好友关系' });
          }
          
          // 添加到好友表
          db.run(
            'INSERT INTO FriendTable (email1, email2) VALUES (?, ?)',
            [inviterEmail, userEmail],
            function(err) {
              if (err) {
                console.error('添加好友关系失败:', err);
                return res.status(500).json({ error: '服务器内部错误' });
              }
              
              // 删除好友请求
              db.run(
                'DELETE FROM FriendRequest WHERE inviter = ? AND invitee = ?',
                [inviterEmail, userEmail],
                (err) => {
                  if (err) {
                    console.error('删除好友请求失败:', err);
                  }
                }
              );
              
              // 获取双方用户信息用于通知
              db.all(
                'SELECT email, username FROM UserTable WHERE email IN (?, ?)',
                [inviterEmail, userEmail],
                (err, users) => {
                  if (!err && users.length === 2) {
                    const userMap = Object.fromEntries(users.map(u => [u.email, u]));
                    
                    // 通知双方好友请求被接受
                    io.emit('friend_request_accepted', {
                      inviter: userMap[inviterEmail],
                      invitee: userMap[userEmail]
                    });
                  }
                }
              );
              
              res.json({ message: '好友请求已接受' });
            }
          );
        }
      );
    }
  );
});

// 拒绝好友请求
app.post('/api/v1/friends/requests/:inviterEmail/reject', (req, res) => {
  const { inviterEmail } = req.params;
  const userEmail = req.headers['user-email'];
  
  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }
  
  // 检查好友请求是否存在
  db.get(
    'SELECT * FROM FriendRequest WHERE inviter = ? AND invitee = ?',
    [inviterEmail, userEmail],
    (err, request) => {
      if (err) {
        console.error('查询好友请求失败:', err);
        return res.status(500).json({ error: '服务器内部错误' });
      }
      
      if (!request) {
        return res.status(404).json({ error: '好友请求不存在' });
      }
      
      // 删除好友请求
      db.run(
        'DELETE FROM FriendRequest WHERE inviter = ? AND invitee = ?',
        [inviterEmail, userEmail],
        function(err) {
          if (err) {
            console.error('删除好友请求失败:', err);
            return res.status(500).json({ error: '服务器内部错误' });
          }
          
          // 获取双方用户信息用于通知
          db.all(
            'SELECT email, username FROM UserTable WHERE email IN (?, ?)',
            [inviterEmail, userEmail],
            (err, users) => {
              if (!err && users.length === 2) {
                const userMap = Object.fromEntries(users.map(u => [u.email, u]));
                
                // 通知邀请方好友请求被拒绝
                io.emit('friend_request_rejected', {
                  inviter: userMap[inviterEmail],
                  invitee: userMap[userEmail]
                });
              }
            }
          );
          
          res.json({ message: '好友请求已拒绝' });
        }
      );
    }
  );
});

// 删除好友
app.delete('/api/v1/friends/:friendId', (req, res) => {
  const { friendId } = req.params;
  const userEmail = req.headers['user-email'];
  
  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }
  
  if (!friendId) {
    return res.status(400).json({ error: '缺少好友ID' });
  }
  
  // 从数据库中删除好友关系（双向删除）
  db.run(
    'DELETE FROM FriendTable WHERE (email1 = ? AND email2 = ?) OR (email1 = ? AND email2 = ?)',
    [userEmail, friendId, friendId, userEmail],
    function(err) {
      if (err) {
        console.error('删除好友关系失败:', err);
        return res.status(500).json({ error: '服务器内部错误' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: '好友关系不存在' });
      }
      
      // 获取双方用户信息用于通知
      db.all(
        'SELECT email, username FROM UserTable WHERE email IN (?, ?)',
        [userEmail, friendId],
        (err, users) => {
          if (!err && users.length >= 1) {
            const userMap = Object.fromEntries(users.map(u => [u.email, u]));
            
            // 通知双方好友关系已删除
            io.emit('friend_deleted', {
              user1: userMap[userEmail],
              user2: userMap[friendId]
            });
          }
        }
      );
      
      console.log(`好友关系已删除: ${userEmail} <-> ${friendId}`);
      res.json({ message: '好友已删除' });
    }
  );
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
  socket.on('join_user_room', (userEmail) => {
    socket.join('user_' + userEmail); // 使用邮箱作为房间名
    socket.userEmail = userEmail;
    onlineUsers.add(userEmail); // 使用邮箱而不是数字ID
    console.log('用户 ' + userEmail + ' 加入房间');
    
    // 更新数据库中的Socket ID和活动时间
    updateUserActivity(userEmail, socket.id, (err) => {
      if (err) {
        console.error('更新用户活动状态失败:', err);
      } else {
        console.log('用户活动状态已更新:', userEmail);
      }
    });
    
    // 广播用户上线状态
    socket.broadcast.emit('friend_status_change', {
      userId: userEmail,
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
    socket.to('user_' + data.receiver_id).emit('new_message', message);
    // 也发送给自己确认
    socket.emit('message_sent', message);
  });

  // 视频通话相关
  socket.on('call_initiated', (data) => {
    socket.to('user_' + data.participant_id).emit('call_initiated', data);
  });

  socket.on('call_accepted', (data) => {
    socket.to('user_' + data.caller_id).emit('call_accepted', data);
  });

  socket.on('call_rejected', (data) => {
    socket.to('user_' + data.caller_id).emit('call_rejected', data);
  });

  socket.on('video_frame', (data) => {
    socket.to('user_' + data.target_user_id).emit('video_frame', data);
  });

  // 断开连接
  socket.on('disconnect', () => {
    if (socket.userEmail) {
      onlineUsers.delete(socket.userEmail);
      
      // 从数据库移除在线状态记录
      removeUserFromOnlineList(socket.userEmail, (err) => {
        if (err) {
          console.error('移除在线用户记录失败:', err);
        } else {
          console.log('用户在线状态已移除:', socket.userEmail);
        }
      });
      
      // 广播用户下线状态
      socket.broadcast.emit('friend_status_change', {
        userId: socket.userEmail,
        status: 'offline'
      });
    }
    console.log('用户断开连接:', socket.id);
  });
});

// ====================== 启动服务器 ======================
const PORT = 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 服务器运行在 http://localhost:' + PORT);
  console.log('📋 测试账号:');
  console.log('   alice@test.com / 123456');
  console.log('   bob@test.com / 123456');
  console.log('');
  console.log('🔗 API端点:');
  console.log('   POST http://localhost:' + PORT + '/api/v1/auth/login');
  console.log('   POST http://localhost:' + PORT + '/api/v1/auth/register');
  console.log('   POST http://localhost:' + PORT + '/api/v1/auth/send-code');
  console.log('   POST http://localhost:' + PORT + '/api/v1/auth/login-with-code');
  console.log('   GET  http://localhost:' + PORT + '/api/v1/friends');
  console.log('   GET  http://localhost:' + PORT + '/api/v1/chat/messages');
  console.log('   POST http://localhost:' + PORT + '/api/v1/chat/messages');
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

// 获取随机图片API
app.get('/api/v1/images/random', (req, res) => {
  const imageNumber = Math.floor(Math.random() * 100) + 1;
  const imagePath = path.join(__dirname, 'imgs', `${imageNumber}.jpg`);
  
  // 检查文件是否存在
  const fs = require('fs');
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    // 如果指定图片不存在，返回默认图片
    const defaultPath = path.join(__dirname, 'imgs', '1.jpg');
    if (fs.existsSync(defaultPath)) {
      res.sendFile(defaultPath);
    } else {
      res.status(404).json({ error: '图片不存在' });
    }
  }
});

// ====================== 加密相关API ======================
// 用户公钥表存储
const userPublicKeys = new Map(); // email -> publicKey

// 交换公钥API
app.post('/api/v1/crypto/key-exchange', (req, res) => {
  const { peer_email, public_key } = req.body;
  const userEmail = req.headers['user-email'];

  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }

  if (!peer_email || !public_key) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  // 存储当前用户的公钥
  userPublicKeys.set(userEmail, public_key);
  console.log(`📝 存储用户公钥: ${userEmail}`);

  // 获取对方的公钥
  const peerPublicKey = userPublicKeys.get(peer_email);
  
  if (peerPublicKey) {
    console.log(`🔑 成功交换公钥: ${userEmail} <-> ${peer_email}`);
    return res.json({ 
      peer_public_key: peerPublicKey,
      status: 'success'
    });
  } else {
    console.log(`⏳ 等待对方公钥: ${peer_email}`);
    return res.json({ 
      peer_public_key: null,
      status: 'waiting',
      message: '对方尚未设置公钥'
    });
  }
});

// 获取用户公钥API
app.get('/api/v1/crypto/public-key/:email', (req, res) => {
  const { email } = req.params;
  const userEmail = req.headers['user-email'];

  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }

  const publicKey = userPublicKeys.get(email);
  
  if (publicKey) {
    res.json({ 
      email: email,
      public_key: publicKey,
      status: 'found'
    });
  } else {
    res.json({ 
      email: email,
      public_key: null,
      status: 'not_found'
    });
  }
});

// 设置用户公钥API
app.post('/api/v1/crypto/public-key', (req, res) => {
  const { public_key } = req.body;
  const userEmail = req.headers['user-email'];

  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }

  if (!public_key) {
    return res.status(400).json({ error: '缺少公钥数据' });
  }

  userPublicKeys.set(userEmail, public_key);
  console.log(`🔐 设置用户公钥: ${userEmail}`);
  
  res.json({ 
    status: 'success',
    message: '公钥设置成功'
  });
});

// 获取最近聊天列表
app.get('/api/v1/chat/recent', (req, res) => {
  const userEmail = req.headers['user-email'];

  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }

  // 查询最近的聊天记录，按对话分组，取每个对话的最新消息
  const query = `
    SELECT 
      CASE 
        WHEN sender = ? THEN receiver 
        ELSE sender 
      END as contact_email,
      MAX(timestamp) as last_timestamp,
      content as last_message,
      sender,
      receiver
    FROM MessageTable 
    WHERE sender = ? OR receiver = ?
    GROUP BY CASE 
      WHEN sender = ? THEN receiver 
      ELSE sender 
    END
    ORDER BY last_timestamp DESC
  `;

  db.all(query, [userEmail, userEmail, userEmail, userEmail], (err, rows) => {
    if (err) {
      console.error('查询最近聊天失败:', err);
      return res.status(500).json({ error: '服务器内部错误' });
    }

    // 获取每个联系人的详细信息
    if (rows.length === 0) {
      return res.json({ chats: [] });
    }

    const contactEmails = rows.map(row => row.contact_email);
    const placeholders = contactEmails.map(() => '?').join(',');

    db.all(
      'SELECT email, username FROM UserTable WHERE email IN (' + placeholders + ')',
      contactEmails,
      (err2, userRows) => {
        if (err2) {
          console.error('查询联系人信息失败:', err2);
          return res.status(500).json({ error: '服务器内部错误' });
        }

        const userMap = {};
        userRows.forEach(user => {
          userMap[user.email] = user;
        });

        const chats = rows.map(row => {
          const contactInfo = userMap[row.contact_email] || {};
          
          // 直接返回完整的时间戳，让前端格式化
          const timestamp = new Date(row.last_timestamp * 1000);

          return {
            id: row.contact_email,
            email: row.contact_email,
            name: contactInfo.username || '未知用户',
            username: contactInfo.username || '未知用户',
            lastMessage: row.last_message || '',
            timestamp: timestamp.toISOString(), // 返回ISO格式让前端处理
            rawTimestamp: row.last_timestamp, // 原始时间戳
            unreadCount: 0, // 暂时不实现已读功能
            // 设置固定的头像生成逻辑，与前端保持一致
            avatar: contactInfo.username ? contactInfo.username.charAt(0).toUpperCase() : '?',
            isOnline: onlineUsers.has(row.contact_email)
          };
        });

        res.json({ chats });
      }
    );
  });
});

// 图片消息存储和检索API
app.post('/api/v1/chat/images', (req, res) => {
  const { receiver_id, image_data, file_name, file_size } = req.body;
  const userEmail = req.headers['user-email'];

  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }

  if (!receiver_id || !image_data) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  // 检查是否为好友关系
  db.get(
    'SELECT * FROM FriendTable WHERE (email1 = ? AND email2 = ?) OR (email1 = ? AND email2 = ?)',
    [userEmail, receiver_id, receiver_id, userEmail],
    (err, friendship) => {
      if (err) {
        console.error('查询好友关系失败:', err);
        return res.status(500).json({ error: '服务器内部错误' });
      }
      
      if (!friendship) {
        return res.status(403).json({ error: '只能向好友发送图片' });
      }

      const timestamp = Date.now() / 1000;
      
      // 存储图片到ImageTable
      db.run(
        'INSERT INTO ImageTable (sender, receiver, image_data, timestamp, file_name, file_size) VALUES (?, ?, ?, ?, ?, ?)',
        [userEmail, receiver_id, image_data, timestamp, file_name, file_size],
        function(err) {
          if (err) {
            console.error('存储图片失败:', err);
            return res.status(500).json({ error: '图片存储失败' });
          }

          const imageMessage = {
            id: this.lastID,
            sender_id: userEmail,
            receiver_id: receiver_id,
            content: image_data, // 图片的base64数据
            type: 'image',
            timestamp: new Date(timestamp * 1000).toISOString(),
            isOwn: true,
            file_name: file_name,
            file_size: file_size
          };

          // 通过WebSocket实时发送给接收方
          const receiverMessage = {
            ...imageMessage,
            isOwn: false
          };
          
          io.to('user_' + receiver_id).emit('new_message', receiverMessage);
          
          // 发送给发送方确认
          io.to('user_' + userEmail).emit('message_sent', imageMessage);

          res.json({ message: imageMessage });
        }
      );
    }
  );
});

// 获取聊天中的图片历史
app.get('/api/v1/chat/images', (req, res) => {
  const { contact_id } = req.query;
  const userEmail = req.headers['user-email'];

  if (!userEmail || !contact_id) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  // 查询图片历史
  db.all(
    `SELECT * FROM ImageTable 
     WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
     ORDER BY timestamp ASC`,
    [userEmail, contact_id, contact_id, userEmail],
    (err, rows) => {
      if (err) {
        console.error('查询图片失败:', err);
        return res.status(500).json({ error: '服务器内部错误' });
      }
      
      const images = rows.map(row => ({
        id: row.id,
        sender_id: row.sender,
        receiver_id: row.receiver,
        content: row.image_data,
        type: 'image',
        timestamp: new Date(row.timestamp * 1000).toISOString(),
        isOwn: row.sender === userEmail,
        file_name: row.file_name,
        file_size: row.file_size
      }));
      
      res.json({ images });
    }
  );
});

// 获取在线好友状态API
app.get('/api/v1/friends/online', (req, res) => {
  const userEmail = req.headers['user-email'];
  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }

  // 获取用户的在线好友列表
  getUserOnlineFriends(userEmail, (err, onlineFriends) => {
    if (err) {
      console.error('查询在线好友失败:', err);
      return res.status(500).json({ error: '服务器内部错误' });
    }

    const friendsWithStatus = onlineFriends.map(friend => ({
      id: friend.user_email,
      email: friend.user_email,
      name: friend.user_name,
      status: friend.status,
      lastActivity: friend.last_activity,
      loginTime: friend.login_time
    }));

    res.json({ 
      success: true,
      onlineFriends: friendsWithStatus,
      count: friendsWithStatus.length
    });
  });
});

// 获取所有在线用户API（管理员功能）
app.get('/api/v1/online-users', (req, res) => {
  const userEmail = req.headers['user-email'];
  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }

  getAllOnlineUsers((err, onlineUsers) => {
    if (err) {
      console.error('查询在线用户失败:', err);
      return res.status(500).json({ error: '服务器内部错误' });
    }

    const usersWithStatus = onlineUsers.map(user => ({
      email: user.user_email,
      name: user.user_name,
      status: user.status,
      lastActivity: user.last_activity,
      loginTime: user.login_time
    }));

    res.json({ 
      success: true,
      onlineUsers: usersWithStatus,
      count: usersWithStatus.length
    });
  });
});

// 登出接口
app.post('/api/v1/auth/logout', (req, res) => {
  const userEmail = req.headers['user-email'];
  if (!userEmail) {
    return res.status(401).json({ error: '需要用户身份认证' });
  }

  // 从在线列表移除用户
  onlineUsers.delete(userEmail);
  
  // 从数据库移除在线状态记录
  removeUserFromOnlineList(userEmail, (err) => {
    if (err) {
      console.error('移除在线用户记录失败:', err);
      return res.status(500).json({ error: '服务器内部错误' });
    }
    
    console.log('用户已登出:', userEmail);
    res.json({ 
      success: true,
      message: '登出成功' 
    });
  });
});