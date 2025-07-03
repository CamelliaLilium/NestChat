/**
 * 用户头像统一管理系统
 * 在应用启动时为所有用户分配固定头像，确保头像在整个应用中保持一致
 */

class AvatarManager {
  constructor() {
    this.userAvatars = new Map(); // 存储用户邮箱到头像的映射
    this.availableAvatars = [
      '1.png', '2.png', '3.png', '4.png', '5.png',
      '6.png', '7.png', '8.jpg', '9.jpg', '10.jpg'
    ]; // 可用的头像列表
    this.initialized = false;
  }

  /**
   * 初始化头像系统
   * @param {Array} users - 用户列表
   */
  async initialize(users = []) {
    if (this.initialized) return;

    try {
      // 从localStorage恢复已分配的头像
      const savedAvatars = localStorage.getItem('userAvatars');
      if (savedAvatars) {
        const parsedAvatars = JSON.parse(savedAvatars);
        this.userAvatars = new Map(Object.entries(parsedAvatars));
      }

      // 为新用户分配头像
      for (const user of users) {
        if (user.email && !this.userAvatars.has(user.email)) {
          this.assignAvatarToUser(user.email);
        }
      }

      this.initialized = true;
      console.log('✅ 头像管理系统初始化完成');
    } catch (error) {
      console.error('❌ 头像管理系统初始化失败:', error);
    }
  }

  /**
   * 为用户分配头像
   * @param {string} userEmail - 用户邮箱
   * @returns {string} 分配的头像文件名
   */
  assignAvatarToUser(userEmail) {
    if (this.userAvatars.has(userEmail)) {
      return this.userAvatars.get(userEmail);
    }

    // 使用邮箱的哈希值来确保同一用户总是得到相同的头像
    const hash = this.hashString(userEmail);
    const avatarIndex = hash % this.availableAvatars.length;
    const avatar = this.availableAvatars[avatarIndex];

    this.userAvatars.set(userEmail, avatar);
    this.saveToLocalStorage();

    return avatar;
  }

  /**
   * 获取用户头像
   * @param {string} userEmail - 用户邮箱
   * @returns {string} 头像URL或首字母
   */
  getUserAvatar(userEmail) {
    if (!userEmail) return '?';

    // 先检查是否已分配头像
    if (this.userAvatars.has(userEmail)) {
      const avatar = this.userAvatars.get(userEmail);
      return `/picture/${avatar}`;
    }

    // 如果没有分配，临时分配一个
    const avatar = this.assignAvatarToUser(userEmail);
    return `/picture/${avatar}`;
  }

  /**
   * 获取用户显示信息（包含头像和首字母备选）
   * @param {Object} user - 用户对象，包含email、name等信息
   * @returns {Object} 包含头像URL和备选显示信息
   */
  getUserDisplay(user) {
    if (!user) return { avatar: null, fallback: '?' };

    const email = user.email || user.account;
    const name = user.name || user.nickname;

    if (!email) {
      return {
        avatar: null,
        fallback: name ? name.charAt(0).toUpperCase() : '?'
      };
    }

    const avatarUrl = this.getUserAvatar(email);
    const fallback = name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase();

    return {
      avatar: avatarUrl,
      fallback: fallback
    };
  }

  /**
   * 简单的字符串哈希函数
   * @param {string} str - 要哈希的字符串
   * @returns {number} 哈希值
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash);
  }

  /**
   * 保存头像分配到localStorage
   */
  saveToLocalStorage() {
    try {
      const avatarsObj = Object.fromEntries(this.userAvatars);
      localStorage.setItem('userAvatars', JSON.stringify(avatarsObj));
    } catch (error) {
      console.error('保存头像分配失败:', error);
    }
  }

  /**
   * 添加新用户并分配头像
   * @param {string} userEmail - 用户邮箱
   * @returns {string} 分配的头像URL
   */
  addUser(userEmail) {
    if (!userEmail) return null;
    
    const avatar = this.assignAvatarToUser(userEmail);
    return `/picture/${avatar}`;
  }

  /**
   * 清除所有头像分配（用于重置）
   */
  reset() {
    this.userAvatars.clear();
    localStorage.removeItem('userAvatars');
    this.initialized = false;
  }
}

// 创建全局实例
const avatarManager = new AvatarManager();

export default avatarManager;
