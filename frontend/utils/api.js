/**
 * API调用工具函数
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      console.log('API请求:', { url, config }); // 添加调试日志
      const response = await fetch(url, config);
      
      console.log('API响应状态:', response.status); // 添加调试日志
      
      // 检查响应是否为JSON格式
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`服务器返回非JSON格式数据，状态码: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API响应数据:', data); // 添加调试日志

      // 对于401错误，也返回数据而不是抛出异常，让调用方处理
      if (!response.ok && response.status !== 401) {
        throw new Error(data.error || data.message || `请求失败，状态码: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API请求错误:', error);
      
      // 区分不同类型的错误
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查后端服务器是否启动');
      } else if (error.name === 'SyntaxError') {
        throw new Error('服务器返回数据格式错误');
      } else {
        throw error;
      }
    }
  }

  // 认证相关
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email, name, password, verificationCode) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password, verificationCode }),
    });
  }

    // 发送验证码
    async sendVerificationCode(email) {
    return this.request('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

      // 添加验证码登录方法
    async loginWithCode(email, code) {
      return this.request('/auth/login-with-code', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
    }

    
  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // 用户相关
  async getProfile() {
    return this.request('/users/profile');
  }

  async updateProfile(data) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 好友相关
  async getFriends() {
    return this.request('/friends');
  }

  async addFriend(friendId) {
    return this.request(`/friends/${friendId}`, {
      method: 'POST',
    });
  }

  async removeFriend(friendId) {
    return this.request(`/friends/${friendId}`, {
      method: 'DELETE',
    });
  }

  // 聊天相关
  async getChatMessages(contactId) {
    return this.request(`/chat/messages?contact_id=${contactId}`);
  }

  async sendMessage(receiverId, content, type = 'text') {
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ receiver_id: receiverId, content, type }),
    });
  }

  // 视频通话相关
  async createVideoSession(participantId) {
    return this.request('/video/sessions', {
      method: 'POST',
      body: JSON.stringify({ participant_id: participantId }),
    });
  }

  async getVideoSession(sessionId) {
    return this.request(`/video/sessions/${sessionId}`);
  }

  async updateVideoSessionStatus(sessionId, status) {
    return this.request(`/video/sessions/${sessionId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }
}

export default new ApiClient();