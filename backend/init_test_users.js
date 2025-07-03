const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

// 连接数据库
const dbPath = path.join(__dirname, 'server.db');
const db = new sqlite3.Database(dbPath);

// 生成密码哈希
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

console.log('🔧 初始化测试用户数据...');

// 添加测试用户
const testUsers = [
  { email: 'alice@test.com', username: 'Alice', password: '123456' },
  { email: 'bob@test.com', username: 'Bob', password: '123456' },
  { email: 'charlie@test.com', username: 'Charlie', password: '123456' },
  { email: 'david@test.com', username: 'David', password: '123456' }
];

db.serialize(() => {
  // 清空现有测试用户数据
  db.run('DELETE FROM UserTable WHERE email LIKE "%@test.com"', (err) => {
    if (err) {
      console.error('清空测试用户失败:', err);
    } else {
      console.log('✅ 清空旧的测试用户数据');
    }
  });

  // 插入新的测试用户
  const insertUser = db.prepare('INSERT INTO UserTable (email, username, pwdhash) VALUES (?, ?, ?)');
  
  testUsers.forEach((user, index) => {
    const pwdhash = hashPassword(user.password);
    insertUser.run(user.email, user.username, pwdhash, (err) => {
      if (err) {
        console.error(`添加用户 ${user.username} 失败:`, err);
      } else {
        console.log(`✅ 添加测试用户: ${user.username} (${user.email})`);
      }
      
      // 如果是最后一个用户，完成操作
      if (index === testUsers.length - 1) {
        insertUser.finalize();
        
        // 添加一些好友关系示例
        db.run('INSERT OR IGNORE INTO FriendTable (email1, email2) VALUES (?, ?)', 
               ['alice@test.com', 'bob@test.com']);
        db.run('INSERT OR IGNORE INTO FriendTable (email1, email2) VALUES (?, ?)', 
               ['bob@test.com', 'alice@test.com']);
        console.log('✅ 添加好友关系: Alice ↔ Bob');
        
        // 添加一些测试消息
        const now = Date.now() / 1000;
        db.run('INSERT INTO MessageTable (sender, receiver, content, timestamp) VALUES (?, ?, ?, ?)',
               ['alice@test.com', 'bob@test.com', '你好，Bob！', now - 3600]);
        db.run('INSERT INTO MessageTable (sender, receiver, content, timestamp) VALUES (?, ?, ?, ?)',
               ['bob@test.com', 'alice@test.com', '嗨，Alice！你好吗？', now - 3500]);
        db.run('INSERT INTO MessageTable (sender, receiver, content, timestamp) VALUES (?, ?, ?, ?)',
               ['alice@test.com', 'bob@test.com', '我很好，谢谢！你呢？', now - 3400]);
        console.log('✅ 添加测试消息');
        
        console.log('\n🎉 测试用户数据初始化完成！');
        console.log('测试用户账号：');
        testUsers.forEach(user => {
          console.log(`- ${user.email} / ${user.password}`);
        });
        
        db.close();
      }
    });
  });
});
