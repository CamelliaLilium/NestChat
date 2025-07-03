/**
 * API调用工具函数
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

class ApiClient {
  /**
   * 获取所有用户（用于全平台搜索）
   * @returns {Promise<Array>} 用户列表
   */
  async getAllUsers() {
    const response = await this.request('/users');
    return response.users || [];
  }

  /**
   * 搜索用户（根据关键词）
   * @param {string} keyword - 搜索关键词（昵称、邮箱等）
   * @returns {Promise<Array>} 匹配的用户列表
   */
  async searchUsers(keyword) {
    if (!keyword || !keyword.trim()) {
      return { users: [] };
    }
    return this.request(`/users/search?q=${encodeURIComponent(keyword.trim())}`);
  }

  /**
   * 获取待处理的好友请求列表（如别人加我）
   * @returns {Promise<Array>} 好友请求列表
   */
  async getFriendRequests() {
    const response = await this.request('/friends/requests');
    return response.requests || [];
  }

  /**
   * 接受好友请求
   * @param {string} inviterEmail - 发起请求的用户邮箱
   * @returns {Promise<Object>} 操作结果
   */
  async acceptFriendRequest(inviterEmail) {
    return this.request(`/friends/requests/${inviterEmail}/accept`, {
      method: 'POST',
    });
  }

  /**
   * 拒绝好友请求
   * @param {string} inviterEmail - 发起请求的用户邮箱
   * @returns {Promise<Object>} 操作结果
   */
  async rejectFriendRequest(inviterEmail) {
    return this.request(`/friends/requests/${inviterEmail}/reject`, {
      method: 'POST',
    });
  }
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
    this.userEmail = localStorage.getItem('user_email');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  setUserEmail(email) {
    this.userEmail = email;
    if (email) {
      localStorage.setItem('user_email', email);
    } else {
      localStorage.removeItem('user_email');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    if (this.userEmail) {
      headers['user-email'] = this.userEmail;
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

  // ===================== 认证相关 =====================

  /**
   * 用户登录
   * @param {string} email - 用户邮箱
   * @param {string} password - 用户密码
   * @returns {Promise<Object>} 登录结果，包含token和用户信息
   */
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  /**
   * 用户注册
   * @param {string} email - 用户邮箱
   * @param {string} name - 用户昵称
   * @param {string} password - 用户密码
   * @param {string} verificationCode - 邮箱验证码
   * @returns {Promise<Object>} 注册结果
   */
  async register(email, name, password, verificationCode) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password, verificationCode }),
    });
  }

  /**
   * 发送邮箱验证码
   * @param {string} email - 用户邮箱
   * @returns {Promise<Object>} 发送结果
   */
  async sendVerificationCode(email) {
    return this.request('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * 邮箱验证码登录
   * @param {string} email - 用户邮箱
   * @param {string} code - 邮箱验证码
   * @returns {Promise<Object>} 登录结果，包含token和用户信息
   */
  async loginWithCode(email, code) {
    return this.request('/auth/login-with-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  /**
   * 用户登出
   * @returns {Promise<Object>} 登出结果
   */
  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // ===================== 在线状态相关 =====================

  /**
   * 获取在线好友列表
   * @returns {Promise<Object>} 在线好友状态信息
   */
  async getOnlineFriends() {
    return this.request('/friends/online');
  }

  /**
   * 获取所有在线用户（管理员功能）
   * @returns {Promise<Object>} 所有在线用户信息
   */
  async getAllOnlineUsers() {
    return this.request('/online-users');
  }

  // ===================== 用户相关 =====================

  /**
   * 获取当前登录用户的个人信息
   * @returns {Promise<Object>} 用户信息（如昵称、邮箱、头像等）
   */
  async getProfile() {
    return this.request('/users/profile');
  }

  /**
   * 更新当前登录用户的个人信息
   * @param {Object} data - 要更新的用户信息（如昵称、头像等）
   * @returns {Promise<Object>} 更新结果
   */
  async updateProfile(data) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ===================== 好友相关 =====================

  /**
   * 获取当前用户的好友列表
   * @returns {Promise<Array>} 好友列表
   */
  async getFriends() {
    const response = await this.request('/friends');
    return response.friends || [];
  }

  /**
   * 发送好友请求
   * @param {string} email - 要添加的用户邮箱
   * @returns {Promise<Object>} 操作结果
   */
  async sendFriendRequest(email) {
    return this.request('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * 添加好友（发送好友请求）
   * @param {string} emailOrId - 好友用户邮箱或ID
   * @returns {Promise<Object>} 添加结果
   */
  async addFriend(emailOrId) {
    return this.sendFriendRequest(emailOrId);
  }
  

  /**
   * 删除好友
   * @param {string} friendId - 好友用户ID
   * @returns {Promise<Object>} 删除结果
   */
  async removeFriend(friendId) {
    return this.request(`/friends/${friendId}`, {
      method: 'DELETE',
    });
  }
  
  /**
   * 删除好友（别名方法，保持向后兼容）
   * @param {string} friendId - 好友用户ID
   * @returns {Promise<Object>} 删除结果
   */
  async handleremoveFriend(friendId) {
    return this.removeFriend(friendId);
  }

  // ===================== 聊天相关 =====================

  /**
   * 获取与指定联系人的聊天消息
   * @param {string} contactId - 联系人用户ID（邮箱）
   * @returns {Promise<Array>} 聊天消息列表
   */
  async getChatMessages(contactId) {
    return this.request(`/chat/messages?contact_id=${encodeURIComponent(contactId)}`);
  }

  /**
   * 发送文本消息
   * @param {string} receiverId - 接收方用户ID（邮箱）
   * @param {string} content - 消息内容
   * @param {string} [type='text'] - 消息类型
   * @returns {Promise<Object>} 发送结果
   */
  async sendTextMessage(receiverId, content, type = 'text') {
    const payload = {
      receiver_id: receiverId,
      content: content,
      type: type
    };
    
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * 发送安全聊天消息（图片隐写）
   * @param {string} receiverId - 接收方用户ID
   * @param {string} imageJpgBase64 - 隐写后的jpg图片base64
   * @param {string} [type='image_stego'] - 消息类型
   * @returns {Promise<Object>} 发送结果
   */
  async sendMessage(receiverId, imageJpgBase64, type = 'image_stego') {
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ receiver_id: receiverId, image_jpg_base64: imageJpgBase64, type }),
    });
  }

  /**
   * 获取聊天消息历史
   * @param {string} chatId - 聊天对象ID（邮箱）
   * @returns {Promise<Object>} 包含消息列表的对象
   */
  async getChatMessages(chatId) {
    return this.request(`/chat/messages?contact_id=${encodeURIComponent(chatId)}`);
  }

  /**
   * 发送消息（加密隐写版本）
   * @param {string} receiverId - 接收方邮箱
   * @param {string} content - 消息内容（明文）
   * @param {string} type - 消息类型
   * @param {string} encryptedImageBase64 - 加密隐写后的图片数据
   * @returns {Promise<Object>} 发送结果
   */
  async sendEncryptedMessage(receiverId, content, type = 'text', encryptedImageBase64 = null) {
    const payload = {
      receiver_id: receiverId,
      content: content,
      type: type,
      encrypted_image: encryptedImageBase64 // 隐写图片数据
    };
    
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * 交换公钥（用于密钥协商）
   * @param {string} peerEmail - 对方邮箱
   * @param {string} publicKey - 自己的RSA公钥
   * @returns {Promise<Object>} 包含对方公钥的对象
   */
  async exchangePublicKey(peerEmail, publicKey) {
    return this.request('/crypto/key-exchange', {
      method: 'POST',
      body: JSON.stringify({
        peer_email: peerEmail,
        public_key: publicKey
      }),
    });
  }

  /**
   * 获取用户的公钥
   * @param {string} userEmail - 用户邮箱
   * @returns {Promise<Object>} 包含公钥的对象
   */
  async getUserPublicKey(userEmail) {
    return this.request(`/crypto/public-key/${encodeURIComponent(userEmail)}`);
  }

  // ===================== 视频通话相关 =====================

  /**
   * 创建视频通话会话
   * @param {string} participantId - 对方用户ID
   * @returns {Promise<Object>} 会话创建结果，包含会话ID等信息
   */
  async createVideoSession(participantId) {
    return this.request('/video/sessions', {
      method: 'POST',
      body: JSON.stringify({ participant_id: participantId }),
    });
  }

  /**
   * 获取视频通话会话详情
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 会话详情
   */
  async getVideoSession(sessionId) {
    return this.request(`/video/sessions/${sessionId}`);
  }

  /**
   * 更新视频通话会话状态（如接听、挂断等）
   * @param {string} sessionId - 会话ID
   * @param {string} status - 新的会话状态
   * @returns {Promise<Object>} 更新结果
   */
  async updateVideoSessionStatus(sessionId, status) {
    return this.request(`/video/sessions/${sessionId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  /**
   * 获取最近聊天列表
   * @returns {Promise<Object>} 包含最近聊天列表的对象
   */
  async getRecentChats() {
    return this.request('/chat/recent');
  }

  /**
   * 创建或获取聊天
   * @param {string} contactEmail - 联系人邮箱
   * @returns {Promise<Object>} 聊天信息
   */
  async createChat(contactEmail) {
    return this.request('/chat/create', {
      method: 'POST',
      body: JSON.stringify({ contact_email: contactEmail })
    });
  }

  /**
   * 发送图片消息
   * @param {string} receiverId - 接收方用户ID（邮箱）
   * @param {string} imageData - 图片base64数据
   * @param {string} fileName - 文件名（可选）
   * @param {number} fileSize - 文件大小（可选）
   * @returns {Promise<Object>} 发送结果
   */
  async sendImageMessage(receiverId, imageData, fileName = null, fileSize = null) {
    const payload = {
      receiver_id: receiverId,
      image_data: imageData,
      file_name: fileName,
      file_size: fileSize
    };
    
    return this.request('/chat/images', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * 获取与指定联系人的图片消息历史
   * @param {string} contactId - 联系人用户ID（邮箱）
   * @returns {Promise<Array>} 图片消息列表
   */
  async getChatImages(contactId) {
    return this.request(`/chat/images?contact_id=${encodeURIComponent(contactId)}`);
  }
}

export default new ApiClient();