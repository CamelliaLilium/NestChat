const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 连接数据库
const dbPath = path.join(__dirname, 'server.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 检查数据库内容...\n');

// 检查用户表
db.all('SELECT * FROM UserTable', (err, rows) => {
  if (err) {
    console.error('查询用户表失败:', err);
  } else {
    console.log('📊 用户表内容:');
    console.table(rows.map(row => ({
      邮箱: row.email,
      用户名: row.username,
      密码哈希: row.pwdhash.substring(0, 16) + '...',
      创建时间: row.created_at
    })));
  }
  
  // 检查好友表
  db.all('SELECT * FROM FriendTable', (err, rows) => {
    if (err) {
      console.error('查询好友表失败:', err);
    } else {
      console.log('\n👥 好友关系表内容:');
      if (rows.length > 0) {
        console.table(rows);
      } else {
        console.log('暂无好友关系数据');
      }
    }
    
    // 检查消息表
    db.all('SELECT * FROM MessageTable', (err, rows) => {
      if (err) {
        console.error('查询消息表失败:', err);
      } else {
        console.log('\n💬 消息表内容:');
        if (rows.length > 0) {
          console.table(rows.map(row => ({
            ID: row.id,
            发送者: row.sender,
            接收者: row.receiver,
            内容: row.content,
            时间戳: new Date(row.timestamp * 1000).toLocaleString()
          })));
        } else {
          console.log('暂无消息数据');
        }
      }
      
      console.log('\n✅ 数据库检查完成');
      db.close();
    });
  });
});