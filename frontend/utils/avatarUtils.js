/**
 * 头像工具函数，确保头像在整个应用中的一致性
 * 更新：现在使用avatarManager来统一管理头像分配
 */

import avatarManager from './avatarManager.js';

// 随机头像选择函数（1-10.jpg）
export function getRandomAvatar() {
  const idx = Math.floor(Math.random() * 10) + 1;
  return `${idx}.png`;
}

// 个性签名数组
const SIGNATURE_POOL = [
  "兄弟你好香",
  "别报错了我真求你了",
  "一定要接上啊",
  "披萨好吃好吃好吃好吃好吃",
  "我将成为！Prompt的王者！",
  "github我恨你",
  "吃什么啊，今天晚上",
  "我服了，我真服了",
  "我真要睡着了",
  "aaa收代码，收项目小窗戳戳",
  "There's no time to lose~",
  "别着急，一定能弄完的",
  "我刚起床，还在床上呢",
  "aaa，你的邮箱验证码是什么",
  "就是想尝尝芝士火鸡面烤冷面",
  "就这样，我的一生就完蛋了",
  "赵延秋女士生日快乐！万寿无疆！"
];

// 根据用户邮箱生成固定的个性签名
export function getSignatureForUser(email) {
  if (!email) return "请输入你的个性签名...";
  
  // 使用邮箱的哈希值来确保每个用户的签名是固定的
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  // 确保索引为正数
  const index = Math.abs(hash) % SIGNATURE_POOL.length;
  return SIGNATURE_POOL[index];
}

// 根据用户邮箱生成固定的头像
export function getAvatarForUser(email) {
  if (!email) return '1.png';
  
  // 使用邮箱的哈希值来确保每个用户的头像是固定的
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  // 确保索引为正数，头像范围是1-100.jpg
  const index = Math.abs(hash) % 100 + 1;
  return `${index}.jpg`;
}

// 获取用户显示头像（优先本地设置，其次固定生成，最后默认）
export function getUserDisplayAvatar(user, avatarOverride = null) {
  if (avatarOverride) return avatarOverride;
  
  // 如果是当前用户，检查localStorage
  const localAvatar = localStorage.getItem('userAvatar');
  if (localAvatar && user?.isSelf) return localAvatar;
  
  // 如果用户已有头像设置
  if (user?.avatar && user.avatar !== '') return user.avatar;
  
  // 根据邮箱生成固定头像
  if (user?.email) return getAvatarForUser(user.email);
  
  // 默认头像
  return '1.jpg';
}

// 获取头像显示内容（可以是图片路径或者首字母）
export function getAvatarDisplay(user) {
  // 使用新的头像管理器
  const displayInfo = avatarManager.getUserDisplay(user);
  
  // 为了兼容现有代码，如果有头像就返回URL，否则返回首字母
  if (displayInfo.avatar) {
    return displayInfo.avatar;
  }
  
  return displayInfo.fallback;
}

// 获取完整的用户头像信息（新版API）
export function getFullAvatarInfo(user) {
  return avatarManager.getUserDisplay(user);
}

// 获取用户头像URL
export function getUserAvatarUrl(userEmail) {
  return avatarManager.getUserAvatar(userEmail);
}
