const path = require('path');
const crypto = require('crypto');

// 尝试加载better-sqlite3
let Database, db;

try {
  Database = require('better-sqlite3');
  
  const dbPath = path.join(__dirname, 'server.db');
  db = new Database(dbPath);
  
  console.log('🔧 初始化数据库...');
  
  // 创建表
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
  
  // 添加测试用户
  const testUsers = [
    { email: 'alice@test.com', username: 'Alice', password: '123456' },
    { email: 'bob@test.com', username: 'Bob', password: '123456' },
    { email: 'charlie@test.com', username: 'Charlie', password: '123456' }
  ];
  
  const insertUser = db.prepare('INSERT OR IGNORE INTO UserTable (email, username, pwdhash) VALUES (?, ?, ?)');
  
  for (const user of testUsers) {
    const pwdhash = crypto.createHash('sha256').update(user.password).digest('hex');
    insertUser.run(user.email, user.username, pwdhash);
    console.log(`✅ 添加测试用户: ${user.username} (${user.email})`);
  }
  
  // 添加一些好友关系示例
  const insertFriend = db.prepare('INSERT OR IGNORE INTO FriendTable (email1, email2) VALUES (?, ?)');
  insertFriend.run('alice@test.com', 'bob@test.com');
  insertFriend.run('bob@test.com', 'alice@test.com');
  console.log('✅ 添加好友关系: Alice ↔ Bob');
  
  // 添加一些测试消息
  const insertMessage = db.prepare('INSERT INTO MessageTable (sender, receiver, content, timestamp) VALUES (?, ?, ?, ?)');
  const now = Date.now() / 1000;
  
  insertMessage.run('alice@test.com', 'bob@test.com', '你好，Bob！', now - 3600);
  insertMessage.run('bob@test.com', 'alice@test.com', '嗨，Alice！你好吗？', now - 3500);
  insertMessage.run('alice@test.com', 'bob@test.com', '我很好，谢谢！你呢？', now - 3400);
  console.log('✅ 添加测试消息');
  
  console.log('\n🎉 数据库初始化完成！');
  console.log('测试用户账号：');
  console.log('- alice@test.com / 123456');
  console.log('- bob@test.com / 123456');
  console.log('- charlie@test.com / 123456');
  
  db.close();
  
} catch (error) {
  console.error('❌ 数据库初始化失败:', error.message);
  console.log('请先运行 npm install better-sqlite3');
  process.exit(1);
}
