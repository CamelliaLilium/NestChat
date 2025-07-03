import { io } from 'socket.io-client';

class SocketClient {
  constructor() {
    this.socket = null;
    this.eventListeners = new Map();
  }

  connect(serverUrl) {
    if (this.socket && this.socket.connected) {
      return;
    }

    // 使用环境变量或动态获取服务器地址
    const defaultUrl = import.meta.env.VITE_WS_URL || `http://${window.location.hostname}:3001`;
    const url = serverUrl || defaultUrl;

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO 连接成功');
      // 重新注册所有事件监听器
      this.eventListeners.forEach((callback, event) => {
        this.socket.on(event, callback);
      });
    });

    this.socket.on('disconnect', () => {
      console.log('Socket.IO 连接断开');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO 连接错误:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    this.eventListeners.set(event, callback);
    if (this.socket && this.socket.connected) {
      this.socket.on(event, callback);
    }
  }

  off(event) {
    this.eventListeners.delete(event);
    if (this.socket) {
      this.socket.off(event);
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
      return true;
    } else {
      console.warn('Socket.IO 未连接，无法发送事件:', event);
      // 如果socket存在但未连接，尝试重新连接
      if (this.socket && !this.socket.connected) {
        console.log('尝试重新连接...');
        this.socket.connect();
      }
      return false;
    }
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }
}

// 创建全局实例
const socketClient = new SocketClient();

export default socketClient;
