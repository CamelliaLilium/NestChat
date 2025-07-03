/**
 * 全局Socket管理器，确保整个应用只有一个Socket连接
 */
import { io } from 'socket.io-client';

class GlobalSocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentUser = null;
    this.messageHandlers = new Set();
    this.eventHandlers = new Map();
  }

  // 初始化Socket连接
  initialize(currentUser) {
    if (!currentUser?.email) {
      console.log('用户信息不完整，无法初始化Socket');
      return;
    }

    this.currentUser = currentUser;

    if (this.socket && this.isConnected) {
      console.log('Socket已连接，无需重复初始化');
      return;
    }

    console.log('初始化Socket连接，用户:', currentUser.email);

    // 获取Socket.IO服务器地址
    let serverUrl;
    
    // 1. 优先使用环境变量
    if (import.meta.env.VITE_WS_URL) {
      serverUrl = import.meta.env.VITE_WS_URL.replace('ws://', 'http://').replace('wss://', 'https://');
    } 
    // 2. 使用API地址推导
    else if (import.meta.env.VITE_API_BASE_URL) {
      serverUrl = import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '');
    }
    // 3. 动态获取当前页面主机
    else {
      serverUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
    }

    console.log('Socket服务器地址:', serverUrl);

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,  // 增加超时时间
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      forceNew: false
    });

    this.socket.on('connect', () => {
      console.log('Socket连接成功');
      this.isConnected = true;
      
      // 加入用户房间
      if (this.currentUser?.email) {
        this.socket.emit('join_user_room', this.currentUser.email);
        console.log('加入用户房间:', this.currentUser.email);
      }

      // 重新注册所有事件处理器
      this.eventHandlers.forEach((handler, event) => {
        this.socket.on(event, handler);
      });
    });

    this.socket.on('disconnect', () => {
      console.log('Socket连接断开');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket连接错误:', error);
      this.isConnected = false;
    });

    // 监听新消息
    this.socket.on('new_message', (message) => {
      console.log('Global Socket收到新消息:', message);
      this.messageHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('消息处理器错误:', error);
        }
      });
    });

    // 监听消息发送确认
    this.socket.on('message_sent', (message) => {
      console.log('Global Socket消息发送确认:', message);
      // 可以在这里添加发送确认的处理逻辑
    });

    // 监听好友状态变化
    this.socket.on('friend_status_change', (data) => {
      console.log('收到好友状态变化:', data);
      // 通知在线状态管理器
      if (window.onlineStatusManager) {
        window.onlineStatusManager.handleStatusChange(data.userId, data.status);
      }
    });

    // 监听用户上线通知
    this.socket.on('user_online', (data) => {
      console.log('用户上线通知:', data);
      if (window.onlineStatusManager) {
        window.onlineStatusManager.handleUserOnline(data);
      }
    });

    // 监听用户下线通知
    this.socket.on('user_offline', (data) => {
      console.log('用户下线通知:', data);
      if (window.onlineStatusManager) {
        window.onlineStatusManager.handleUserOffline(data);
      }
    });
  }

  // 注册消息处理器
  addMessageHandler(handler) {
    this.messageHandlers.add(handler);
  }

  // 移除消息处理器
  removeMessageHandler(handler) {
    this.messageHandlers.delete(handler);
  }

  // 注册事件处理器
  on(event, handler) {
    this.eventHandlers.set(event, handler);
    if (this.socket && this.isConnected) {
      this.socket.on(event, handler);
    }
  }

  // 移除事件处理器
  off(event) {
    this.eventHandlers.delete(event);
    if (this.socket) {
      this.socket.off(event);
    }
  }

  // 发送事件
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket未连接，无法发送事件:', event);
    }
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.messageHandlers.clear();
    this.eventHandlers.clear();
  }
}

// 导出单例
export default new GlobalSocketManager();
