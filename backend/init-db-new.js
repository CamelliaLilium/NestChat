const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

// 数据库路径
const dbPath = path.join(__dirname, 'server.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  }
  console.log('🔧 初始化数据库...');
});

// 创建表
db.serialize(() => {
  // 创建用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS UserTable (
      email VARCHAR(64) PRIMARY KEY,
      username VARCHAR(32) NOT NULL,
      pwdhash CHAR(64) NOT NULL
    )
  `, (err) => {
    if (err) console.error('创建UserTable失败:', err);
    else console.log('✅ UserTable已创建');
  });
  
  // 创建好友表
  db.run(`
    CREATE TABLE IF NOT EXISTS FriendTable (
      email1 VARCHAR(64),
      email2 VARCHAR(64),
      PRIMARY KEY (email1, email2),
      FOREIGN KEY (email1) REFERENCES UserTable(email),
      FOREIGN KEY (email2) REFERENCES UserTable(email)
    )
  `, (err) => {
    if (err) console.error('创建FriendTable失败:', err);
    else console.log('✅ FriendTable已创建');
  });
  
  // 创建好友请求表
  db.run(`
    CREATE TABLE IF NOT EXISTS FriendRequest (
      inviter VARCHAR(64),
      invitee VARCHAR(64),
      request_time REAL NOT NULL,
      PRIMARY KEY (inviter, invitee),
      FOREIGN KEY (inviter) REFERENCES UserTable(email),
      FOREIGN KEY (invitee) REFERENCES UserTable(email)
    )
  `, (err) => {
    if (err) console.error('创建FriendRequest失败:', err);
    else console.log('✅ FriendRequest已创建');
  });
  
  // 创建消息表（更新了结构）
  db.run(`
    CREATE TABLE IF NOT EXISTS MessageTable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender VARCHAR(64) NOT NULL,
      receiver VARCHAR(64) NOT NULL,
      content TEXT NOT NULL,
      timestamp REAL NOT NULL,
      type VARCHAR(16) DEFAULT 'text',
      encrypted_image TEXT,
      FOREIGN KEY (sender) REFERENCES UserTable(email),
      FOREIGN KEY (receiver) REFERENCES UserTable(email)
    )
  `, (err) => {
    if (err) console.error('创建MessageTable失败:', err);
    else console.log('✅ MessageTable已创建');
  });
  
  // 创建图片表（新增）
  db.run(`
    CREATE TABLE IF NOT EXISTS ImageTable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender VARCHAR(64) NOT NULL,
      receiver VARCHAR(64) NOT NULL,
      image_data TEXT NOT NULL,
      timestamp REAL NOT NULL,
      file_name VARCHAR(255),
      file_size INTEGER,
      FOREIGN KEY (sender) REFERENCES UserTable(email),
      FOREIGN KEY (receiver) REFERENCES UserTable(email)
    )
  `, (err) => {
    if (err) console.error('创建ImageTable失败:', err);
    else console.log('✅ ImageTable已创建');
  });

  // 添加测试用户
  const testUsers = [
    { email: 'alice@test.com', username: 'Alice', password: '123456' },
    { email: 'bob@test.com', username: 'Bob', password: '123456' },
    { email: 'charlie@test.com', username: 'Charlie', password: '123456' }
  ];

  console.log('\n🔧 添加测试用户...');
  
  testUsers.forEach((user) => {
    const pwdhash = crypto.createHash('sha256').update(user.password).digest('hex');
    db.run(
      'INSERT OR IGNORE INTO UserTable (email, username, pwdhash) VALUES (?, ?, ?)',
      [user.email, user.username, pwdhash],
      function(err) {
        if (err) {
          console.error(`添加用户${user.username}失败:`, err);
        } else {
          console.log(`✅ 添加测试用户: ${user.username} (${user.email})`);
        }
      }
    );
  });

  // 添加好友关系
  setTimeout(() => {
    console.log('\n🔧 添加好友关系...');
    db.run(
      'INSERT OR IGNORE INTO FriendTable (email1, email2) VALUES (?, ?)',
      ['alice@test.com', 'bob@test.com'],
      (err) => {
        if (!err) console.log('✅ 添加好友关系: Alice → Bob');
      }
    );
    
    db.run(
      'INSERT OR IGNORE INTO FriendTable (email1, email2) VALUES (?, ?)',
      ['bob@test.com', 'alice@test.com'],
      (err) => {
        if (!err) console.log('✅ 添加好友关系: Bob → Alice');
      }
    );

    // 添加测试消息
    setTimeout(() => {
      console.log('\n🔧 添加测试消息...');
      const now = Date.now() / 1000;
      
      const testMessages = [
        { sender: 'alice@test.com', receiver: 'bob@test.com', content: '你好，Bob！', time: now - 3600 },
        { sender: 'bob@test.com', receiver: 'alice@test.com', content: '嗨，Alice！你好吗？', time: now - 3500 },
        { sender: 'alice@test.com', receiver: 'bob@test.com', content: '我很好，谢谢！你呢？', time: now - 3400 }
      ];
      
      testMessages.forEach((msg, index) => {
        db.run(
          'INSERT INTO MessageTable (sender, receiver, content, timestamp) VALUES (?, ?, ?, ?)',
          [msg.sender, msg.receiver, msg.content, msg.time],
          function(err) {
            if (err) {
              console.error(`添加测试消息${index + 1}失败:`, err);
            } else {
              console.log(`✅ 添加测试消息: ${msg.sender} → ${msg.receiver}`);
            }
            
            // 最后一条消息添加完成后关闭数据库
            if (index === testMessages.length - 1) {
              setTimeout(() => {
                console.log('\n🎉 数据库初始化完成！');
                console.log('测试用户账号：');
                console.log('- alice@test.com / 123456');
                console.log('- bob@test.com / 123456');
                console.log('- charlie@test.com / 123456');
                
                db.close((err) => {
                  if (err) {
                    console.error('关闭数据库失败:', err);
                  } else {
                    console.log('🔒 数据库已关闭');
                  }
                });
              }, 500);
            }
          }
        );
      });
    }, 500);
  }, 500);
});
