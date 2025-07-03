/**
 * 在线状态管理器
 * 负责管理用户在线状态、好友状态同步、状态更新推送等功能
 */
import apiClient from './api.js';

class OnlineStatusManager {
  constructor() {
    this.onlineUsers = new Map(); // 存储在线用户信息
    this.statusChangeHandlers = new Set(); // 状态变化回调函数
    this.currentUser = null;
    this.pollInterval = null;
    this.statusPollInterval = 30000; // 30秒轮询一次
    this.initialized = false;
  }

  // 初始化在线状态管理器
  initialize(currentUser, socket = null) {
    if (!currentUser?.email) {
      console.log('用户信息不完整，无法初始化在线状态管理');
      return false;
    }

    this.currentUser = currentUser;
    this.initialized = true;

    console.log('初始化在线状态管理器，用户:', currentUser.email);

    // 如果有Socket连接，监听状态变化事件
    if (socket) {
      this.setupSocketListeners(socket);
    }

    // 开始定期轮询在线状态
    this.startStatusPolling();

    // 立即获取一次在线好友状态
    this.refreshOnlineFriends();

    return true;
  }

  // 设置Socket监听器
  setupSocketListeners(socket) {
    // 监听好友状态变化
    socket.on('friend_status_change', (data) => {
      console.log('收到好友状态变化:', data);
      this.handleStatusChange(data.userId, data.status);
    });

    // 监听用户上线通知
    socket.on('user_online', (data) => {
      console.log('用户上线:', data);
      this.handleUserOnline(data);
    });

    // 监听用户下线通知
    socket.on('user_offline', (data) => {
      console.log('用户下线:', data);
      this.handleUserOffline(data);
    });
  }

  // 开始状态轮询
  startStatusPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.pollInterval = setInterval(() => {
      this.refreshOnlineFriends();
    }, this.statusPollInterval);
  }

  // 停止状态轮询
  stopStatusPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // 刷新在线好友状态
  async refreshOnlineFriends() {
    if (!this.initialized || !this.currentUser?.email) {
      return;
    }

    try {
      const response = await apiClient.getOnlineFriends();
      if (response.success) {
        this.updateOnlineUsersList(response.onlineFriends);
      }
    } catch (error) {
      console.error('获取在线好友状态失败:', error);
    }
  }

  // 更新在线用户列表
  updateOnlineUsersList(onlineFriends) {
    const previousOnlineUsers = new Map(this.onlineUsers);
    this.onlineUsers.clear();

    // 更新在线用户列表
    onlineFriends.forEach(friend => {
      this.onlineUsers.set(friend.email, {
        email: friend.email,
        name: friend.name,
        status: friend.status,
        lastActivity: friend.lastActivity,
        loginTime: friend.loginTime
      });
    });

    // 检测状态变化并触发回调
    this.detectAndNotifyStatusChanges(previousOnlineUsers, this.onlineUsers);
  }

  // 检测状态变化并通知
  detectAndNotifyStatusChanges(previousUsers, currentUsers) {
    // 检查新上线的用户
    currentUsers.forEach((user, email) => {
      if (!previousUsers.has(email)) {
        this.notifyStatusChange(email, 'online', user);
      }
    });

    // 检查下线的用户
    previousUsers.forEach((user, email) => {
      if (!currentUsers.has(email)) {
        this.notifyStatusChange(email, 'offline', user);
      }
    });
  }

  // 处理状态变化
  handleStatusChange(userId, status) {
    if (status === 'online') {
      // 刷新在线状态，获取完整用户信息
      this.refreshOnlineFriends();
    } else {
      // 用户下线，从列表中移除
      if (this.onlineUsers.has(userId)) {
        const user = this.onlineUsers.get(userId);
        this.onlineUsers.delete(userId);
        this.notifyStatusChange(userId, status, user);
      }
    }
  }

  // 处理用户上线
  handleUserOnline(userData) {
    this.onlineUsers.set(userData.email, userData);
    this.notifyStatusChange(userData.email, 'online', userData);
  }

  // 处理用户下线
  handleUserOffline(userData) {
    if (this.onlineUsers.has(userData.email)) {
      this.onlineUsers.delete(userData.email);
      this.notifyStatusChange(userData.email, 'offline', userData);
    }
  }

  // 通知状态变化
  notifyStatusChange(userId, status, userData) {
    this.statusChangeHandlers.forEach(handler => {
      try {
        handler({
          userId,
          status,
          userData,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('状态变化处理器错误:', error);
      }
    });
  }

  // 添加状态变化监听器
  addStatusChangeListener(handler) {
    if (typeof handler === 'function') {
      this.statusChangeHandlers.add(handler);
      return () => this.statusChangeHandlers.delete(handler);
    }
  }

  // 移除状态变化监听器
  removeStatusChangeListener(handler) {
    this.statusChangeHandlers.delete(handler);
  }

  // 获取用户在线状态
  getUserStatus(userEmail) {
    if (this.onlineUsers.has(userEmail)) {
      return this.onlineUsers.get(userEmail).status || 'online';
    }
    return 'offline';
  }

  // 获取在线用户列表
  getOnlineUsers() {
    return Array.from(this.onlineUsers.values());
  }

  // 获取在线用户数量
  getOnlineUserCount() {
    return this.onlineUsers.size;
  }

  // 检查用户是否在线
  isUserOnline(userEmail) {
    return this.onlineUsers.has(userEmail);
  }

  // 销毁管理器
  destroy() {
    this.stopStatusPolling();
    this.onlineUsers.clear();
    this.statusChangeHandlers.clear();
    this.currentUser = null;
    this.initialized = false;
  }

  // 手动同步状态
  async syncStatus() {
    await this.refreshOnlineFriends();
  }
}

// 创建全局实例
const onlineStatusManager = new OnlineStatusManager();

export default onlineStatusManager;
