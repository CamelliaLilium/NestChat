-- 创建 CurrentUsers 表用于记录用户在线状态
-- 该表记录当前在线用户的状态信息

DROP TABLE IF EXISTS CurrentUsers;

CREATE TABLE CurrentUsers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL UNIQUE,           -- 用户邮箱（主要标识）
    user_name TEXT NOT NULL,                   -- 用户姓名
    ip_address TEXT NOT NULL,                  -- 用户IP地址
    port_number INTEGER,                       -- 端口号
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 登录时间
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP, -- 最后活动时间
    socket_id TEXT,                           -- Socket连接ID
    user_agent TEXT,                          -- 用户代理信息
    status TEXT DEFAULT 'online' CHECK (status IN ('online', 'away', 'busy')), -- 用户状态
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX idx_current_users_email ON CurrentUsers(user_email);
CREATE INDEX idx_current_users_status ON CurrentUsers(status);
CREATE INDEX idx_current_users_last_activity ON CurrentUsers(last_activity);

-- 创建触发器，自动更新 updated_at 字段
CREATE TRIGGER update_current_users_timestamp 
    AFTER UPDATE ON CurrentUsers
BEGIN
    UPDATE CurrentUsers 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;
