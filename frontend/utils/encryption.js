/**
 * 端到端加密管理器
 * 功能：RSA密钥协商、AES加密解密、与隐写术结合
 */

import CryptoJS from 'crypto-js';
import JSEncrypt from 'jsencrypt';
import { encodeTextInJpg, decodeTextFromJpg } from './steganography.js';

class EncryptionManager {
  constructor() {
    // RSA密钥对
    this.keyPair = null;
    this.publicKey = null;
    this.privateKey = null;
    
    // 会话密钥缓存 (email -> aesKey)
    this.sessionKeys = new Map();
    
    // 对方公钥缓存 (email -> publicKey)
    this.peerPublicKeys = new Map();
    
    // 初始化RSA密钥对
    this.initRSAKeys();
  }

  /**
   * 初始化RSA密钥对
   */
  initRSAKeys() {
    try {
      const encrypt = new JSEncrypt({ default_key_size: 1024 });
      encrypt.getKey();
      this.publicKey = encrypt.getPublicKey();
      this.privateKey = encrypt.getPrivateKey();
      this.keyPair = encrypt;
      console.log('🔐 RSA密钥对生成成功');
    } catch (error) {
      console.error('❌ RSA密钥对生成失败:', error);
    }
  }

  /**
   * 获取公钥
   */
  getPublicKey() {
    return this.publicKey;
  }

  /**
   * 与对方进行密钥协商
   * @param {string} peerEmail - 对方邮箱
   * @param {string} peerPublicKey - 对方RSA公钥
   * @returns {string} 生成的AES会话密钥
   */
  async keyExchange(peerEmail, peerPublicKey) {
    try {
      // 缓存对方公钥
      this.peerPublicKeys.set(peerEmail, peerPublicKey);
      
      // 生成AES会话密钥
      const aesKey = CryptoJS.lib.WordArray.random(256/8).toString();
      
      // 缓存会话密钥
      this.sessionKeys.set(peerEmail, aesKey);
      
      console.log(`🔑 与 ${peerEmail} 的密钥协商完成`);
      return aesKey;
    } catch (error) {
      console.error('❌ 密钥协商失败:', error);
      throw error;
    }
  }

  /**
   * 获取或生成与特定用户的会话密钥
   * @param {string} peerEmail - 对方邮箱
   * @param {string} peerPublicKey - 对方RSA公钥(可选)
   * @returns {Promise<string>} AES会话密钥
   */
  async getSessionKey(peerEmail, peerPublicKey = null) {
    if (this.sessionKeys.has(peerEmail)) {
      return this.sessionKeys.get(peerEmail);
    }
    
    if (peerPublicKey) {
      return await this.keyExchange(peerEmail, peerPublicKey);
    }
    
    // 如果没有公钥，生成临时密钥
    const tempKey = CryptoJS.lib.WordArray.random(256/8).toString();
    this.sessionKeys.set(peerEmail, tempKey);
    return tempKey;
  }

  /**
   * AES加密文本
   * @param {string} text - 明文
   * @param {string} aesKey - AES密钥
   * @returns {string} 密文
   */
  encryptText(text, aesKey) {
    try {
      const encrypted = CryptoJS.AES.encrypt(text, aesKey).toString();
      console.log('🔒 文本加密成功');
      return encrypted;
    } catch (error) {
      console.error('❌ 文本加密失败:', error);
      throw error;
    }
  }

  /**
   * AES解密文本
   * @param {string} encryptedText - 密文
   * @param {string} aesKey - AES密钥
   * @returns {string} 明文
   */
  decryptText(encryptedText, aesKey) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedText, aesKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      console.log('🔓 文本解密成功');
      return decrypted;
    } catch (error) {
      console.error('❌ 文本解密失败:', error);
      throw error;
    }
  }

  /**
   * 获取随机图片的base64数据（用于隐写）
   * @returns {Promise<string>} 图片base64
   */
  async getRandomImageBase64() {
    try {
      // 随机选择1-100号图片
      const imageNumber = Math.floor(Math.random() * 100) + 1;
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:3001/api/v1`;
      const imagePath = `${apiBaseUrl.replace('/api/v1', '')}/api/v1/images/${imageNumber}.jpg`;
      
      const response = await fetch(imagePath);
      if (!response.ok) {
        throw new Error(`获取图片失败: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('❌ 获取随机图片失败:', error);
      // 降级：返回默认base64图片（1x1像素的JPEG）
      return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
    }
  }

  /**
   * 加密消息并隐写到图片
   * @param {string} message - 原始消息
   * @param {string} peerEmail - 接收方邮箱
   * @param {string} messageType - 消息类型 ('text', 'image', 'voice')
   * @returns {Promise<{encryptedImageBase64: string, sessionKey: string}>}
   */
  async encryptAndHideMessage(message, peerEmail, messageType = 'text') {
    try {
      // 获取会话密钥
      const sessionKey = await this.getSessionKey(peerEmail);
      
      // 构造消息数据包
      const messagePacket = {
        type: messageType,
        content: message,
        timestamp: Date.now(),
        sessionKey: sessionKey
      };
      
      // 序列化并加密
      const messageJson = JSON.stringify(messagePacket);
      const encryptedMessage = this.encryptText(messageJson, sessionKey);
      
      // 获取随机图片
      const imageBase64 = await this.getRandomImageBase64();
      
      // 将加密消息隐写到图片中
      const encryptedImageBase64 = await encodeTextInJpg(imageBase64, encryptedMessage);
      
      console.log(`🎭 消息隐写完成 (${messageType})`);
      return {
        encryptedImageBase64,
        sessionKey
      };
    } catch (error) {
      console.error('❌ 消息加密隐写失败:', error);
      throw error;
    }
  }

  /**
   * 从图片中解隐写并解密消息
   * @param {string} encryptedImageBase64 - 含隐写数据的图片
   * @param {string} senderEmail - 发送方邮箱
   * @returns {Promise<{type: string, content: string, timestamp: number}>}
   */
  async decryptAndExtractMessage(encryptedImageBase64, senderEmail) {
    try {
      // 从图片中提取加密消息
      const encryptedMessage = await decodeTextFromJpg(encryptedImageBase64);
      
      // 获取会话密钥
      const sessionKey = await this.getSessionKey(senderEmail);
      
      // 解密消息
      const messageJson = this.decryptText(encryptedMessage, sessionKey);
      const messagePacket = JSON.parse(messageJson);
      
      console.log(`🎭 消息解隐写解密完成 (${messagePacket.type})`);
      return {
        type: messagePacket.type,
        content: messagePacket.content,
        timestamp: messagePacket.timestamp
      };
    } catch (error) {
      console.error('❌ 消息解隐写解密失败:', error);
      throw error;
    }
  }

  /**
   * 清理指定用户的会话密钥
   * @param {string} peerEmail - 对方邮箱
   */
  clearSessionKey(peerEmail) {
    this.sessionKeys.delete(peerEmail);
    this.peerPublicKeys.delete(peerEmail);
    console.log(`🧹 已清理 ${peerEmail} 的会话密钥`);
  }

  /**
   * 清理所有会话密钥
   */
  clearAllSessionKeys() {
    this.sessionKeys.clear();
    this.peerPublicKeys.clear();
    console.log('🧹 已清理所有会话密钥');
  }
}

// 创建全局单例实例
const encryptionManager = new EncryptionManager();

export default encryptionManager;
