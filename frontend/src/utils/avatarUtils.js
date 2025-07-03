/**
 * 头像工具函数
 * 为所有用户提供一致的头像分配逻辑
 */

// 头像池
const AVATAR_POOL = [
  '1.png', '2.png', '3.png', '4.png', '5.png', '6.png', '7.png',
  '8.jpg', '9.jpg', '10.jpg'
];

/**
 * 根据用户邮箱生成固定的头像
 * @param {string} email - 用户邮箱
 * @returns {string} 头像文件名
 */
export function getAvatarForUser(email) {
  if (!email) return '1.png';
  
  // 使用邮箱的哈希值来确保每个用户的头像是固定的
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  // 确保索引为正数
  const index = Math.abs(hash) % AVATAR_POOL.length;
  return AVATAR_POOL[index];
}

/**
 * 获取随机头像（用于测试或临时使用）
 * @returns {string} 随机头像文件名
 */
export function getRandomAvatar() {
  const idx = Math.floor(Math.random() * AVATAR_POOL.length);
  return AVATAR_POOL[idx];
}

/**
 * 获取头像的完整路径
 * @param {string} email - 用户邮箱
 * @returns {string} 头像的完整路径
 */
export function getAvatarPath(email) {
  return `/picture/${getAvatarForUser(email)}`;
}

/**
 * 为用户对象添加头像字段
 * @param {Object} user - 用户对象
 * @returns {Object} 包含头像的用户对象
 */
export function addAvatarToUser(user) {
  if (!user) return user;
  
  return {
    ...user,
    avatar: getAvatarForUser(user.email || user.account),
    avatarPath: getAvatarPath(user.email || user.account)
  };
}

/**
 * 为用户数组中的每个用户添加头像
 * @param {Array} users - 用户数组
 * @returns {Array} 包含头像的用户数组
 */
export function addAvatarToUsers(users) {
  if (!Array.isArray(users)) return users;
  
  return users.map(user => addAvatarToUser(user));
}
