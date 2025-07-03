// steganography.js
// 简单封装：将文本藏入jpg图片base64，以及从图片base64提取文本
// 使用Canvas API实现，避免依赖jimp

/**
 * 将文本藏入jpg图片base64（每8位一字符，支持任意utf8文本）
 * @param {string} imageBase64 - jpg图片base64字符串
 * @param {string} text - 要隐藏的文本
 * @returns {Promise<string>} - 隐写后的jpg图片base64
 */
export async function encodeTextInJpg(imageBase64, text) {
  return new Promise((resolve, reject) => {
    try {
      // utf8编码为字节
      const encoder = new TextEncoder();
      const textBytes = encoder.encode(text);
      // 先写入长度（4字节，big-endian）
      const lenBytes = new Uint8Array(4);
      const len = textBytes.length;
      lenBytes[0] = (len >> 24) & 0xFF;
      lenBytes[1] = (len >> 16) & 0xFF;
      lenBytes[2] = (len >> 8) & 0xFF;
      lenBytes[3] = len & 0xFF;
      const allBytes = new Uint8Array(4 + textBytes.length);
      allBytes.set(lenBytes, 0);
      allBytes.set(textBytes, 4);
      
      // 转为bit数组
      const bits = [];
      for (let i = 0; i < allBytes.length; i++) {
        for (let b = 7; b >= 0; b--) {
          bits.push((allBytes[i] >> b) & 1);
        }
      }
      
      // 创建图片
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const totalPixels = img.width * img.height;
          
          if (bits.length > totalPixels) {
            reject(new Error('文本过长，图片容量不足'));
            return;
          }
          
          // 将bits隐写到蓝色通道的LSB
          for (let i = 0; i < bits.length; i++) {
            const pixelIndex = i * 4 + 2; // 蓝色通道
            imageData.data[pixelIndex] = (imageData.data[pixelIndex] & 0xFE) | bits[i];
          }
          
          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = imageBase64;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 从jpg图片base64提取文本（自动识别长度，支持任意utf8文本）
 * @param {string} imageBase64 - jpg图片base64字符串
 * @returns {Promise<string>} - 提取出的文本
 */
export async function decodeTextFromJpg(imageBase64) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const totalPixels = img.width * img.height;
          
          // 先取前32位（4字节）为长度
          let len = 0;
          for (let i = 0; i < 32; i++) {
            const pixelIndex = i * 4 + 2; // 蓝色通道
            const bit = imageData.data[pixelIndex] & 0x01;
            len = (len << 1) | bit;
          }
          
          // 取后面len*8位为内容
          const textBytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            let byte = 0;
            for (let b = 0; b < 8; b++) {
              const bitIndex = 32 + i * 8 + b;
              const pixelIndex = bitIndex * 4 + 2;
              if (pixelIndex < imageData.data.length) {
                const bit = imageData.data[pixelIndex] & 0x01;
                byte = (byte << 1) | bit;
              }
            }
            textBytes[i] = byte;
          }
          
          const decoder = new TextDecoder();
          resolve(decoder.decode(textBytes));
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = imageBase64;
    } catch (error) {
      reject(error);
    }
  });
}
