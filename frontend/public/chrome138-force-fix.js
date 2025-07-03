/**
 * Chrome 138 强制修复脚本
 * 针对MediaDevices API问题的强制修复
 */

// 立即执行的修复脚本
(function() {
  console.log('🔧 Chrome 138 强制修复开始...');
  
  // 1. 修复MediaDevices API
  if (!navigator.mediaDevices) {
    console.warn('MediaDevices不存在，尝试Polyfill...');
    
    // 创建MediaDevices Polyfill
    navigator.mediaDevices = {};
    
    // 实现getUserMedia Polyfill
    navigator.mediaDevices.getUserMedia = function(constraints) {
      return new Promise((resolve, reject) => {
        const getUserMedia = navigator.getUserMedia || 
                           navigator.webkitGetUserMedia || 
                           navigator.mozGetUserMedia || 
                           navigator.msGetUserMedia;
        
        if (!getUserMedia) {
          reject(new Error('getUserMedia not supported'));
          return;
        }
        
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
    
    // 实现enumerateDevices Polyfill
    navigator.mediaDevices.enumerateDevices = function() {
      return Promise.resolve([]);
    };
    
    console.log('✅ MediaDevices Polyfill已安装');
  }
  
  // 2. 修复MediaRecorder API
  if (!window.MediaRecorder) {
    console.warn('MediaRecorder不存在，尝试Polyfill...');
    
    // 简单的MediaRecorder Polyfill
    window.MediaRecorder = class {
      constructor(stream, options = {}) {
        this.stream = stream;
        this.options = options;
        this.state = 'inactive';
        this.chunks = [];
        this.ondataavailable = null;
        this.onstop = null;
        this.onstart = null;
        this.onerror = null;
      }
      
      start(timeslice) {
        this.state = 'recording';
        this.chunks = [];
        console.log('Polyfill MediaRecorder started');
        
        if (this.onstart) {
          this.onstart();
        }
        
        // 模拟录制过程
        this.recordingInterval = setInterval(() => {
          if (this.ondataavailable) {
            // 创建模拟数据
            const blob = new Blob(['audio data'], { type: 'audio/webm' });
            this.ondataavailable({ data: blob });
          }
        }, timeslice || 1000);
      }
      
      stop() {
        this.state = 'inactive';
        
        if (this.recordingInterval) {
          clearInterval(this.recordingInterval);
        }
        
        console.log('Polyfill MediaRecorder stopped');
        
        if (this.onstop) {
          this.onstop();
        }
      }
      
      static isTypeSupported(type) {
        return ['audio/webm', 'audio/mp4'].includes(type.split(';')[0]);
      }
    };
    
    console.log('✅ MediaRecorder Polyfill已安装');
  }
  
  // 3. 强制启用必要的API
  if (!window.AudioContext && !window.webkitAudioContext) {
    console.warn('AudioContext不支持');
  } else {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
  }
  
  // 4. 修复WebSocket连接问题
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    console.log('WebSocket连接尝试:', url);
    
    // 如果URL包含localhost，替换为当前主机
    if (url.includes('localhost')) {
      const newUrl = url.replace('localhost', window.location.hostname);
      console.log('WebSocket URL修正:', newUrl);
      return new originalWebSocket(newUrl, protocols);
    }
    
    return new originalWebSocket(url, protocols);
  };
  
  // 保持原型链
  window.WebSocket.prototype = originalWebSocket.prototype;
  Object.setPrototypeOf(window.WebSocket, originalWebSocket);
  
  // 5. 添加权限检查helper
  window.checkMediaPermissions = async function() {
    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'microphone' });
        console.log('权限状态:', result.state);
        return result.state;
      }
      return 'unknown';
    } catch (e) {
      console.warn('权限检查失败:', e);
      return 'unknown';
    }
  };
  
  // 6. 添加设备检测helper
  window.detectMediaDevices = async function() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        console.log('检测到音频输入设备:', audioInputs.length);
        return audioInputs;
      }
      return [];
    } catch (e) {
      console.warn('设备检测失败:', e);
      return [];
    }
  };
  
  // 7. 添加录音测试helper
  window.testRecording = async function() {
    console.log('🎤 开始录音测试...');
    
    try {
      // 检查权限
      const permission = await window.checkMediaPermissions();
      console.log('权限状态:', permission);
      
      // 检测设备
      const devices = await window.detectMediaDevices();
      console.log('音频设备:', devices);
      
      // 尝试获取音频流
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      console.log('✅ 音频流获取成功');
      
      // 尝试创建MediaRecorder
      const recorder = new MediaRecorder(stream);
      console.log('✅ MediaRecorder创建成功');
      
      // 清理
      stream.getTracks().forEach(track => track.stop());
      
      return { success: true, message: '录音测试通过' };
      
    } catch (error) {
      console.error('❌ 录音测试失败:', error);
      return { 
        success: false, 
        error: error.name,
        message: error.message 
      };
    }
  };
  
  // 8. 修复fetch请求
  const originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    // 如果URL包含localhost，替换为当前主机
    if (typeof url === 'string' && url.includes('localhost')) {
      url = url.replace('localhost', window.location.hostname);
    }
    
    // 添加默认的CORS选项
    const defaultOptions = {
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    return originalFetch(url, { ...defaultOptions, ...options });
  };
  
  console.log('🔧 Chrome 138 强制修复完成');
  
  // 自动运行测试
  setTimeout(() => {
    window.testRecording().then(result => {
      if (result.success) {
        console.log('✅ 自动录音测试通过');
      } else {
        console.error('❌ 自动录音测试失败:', result);
        
        // 显示用户友好的错误提示
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ff4444;
          color: white;
          padding: 15px;
          border-radius: 10px;
          z-index: 10000;
          max-width: 300px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        errorDiv.innerHTML = `
          <strong>🚨 录音功能异常</strong><br>
          错误: ${result.error}<br>
          <small>${result.message}</small><br>
          <button onclick="this.parentElement.remove(); window.location.reload();" style="
            background: white; 
            color: #ff4444; 
            border: none; 
            padding: 5px 10px; 
            border-radius: 5px; 
            margin-top: 10px;
            cursor: pointer;
          ">重新加载</button>
        `;
        document.body.appendChild(errorDiv);
        
        // 10秒后自动移除
        setTimeout(() => {
          if (errorDiv.parentElement) {
            errorDiv.remove();
          }
        }, 10000);
      }
    });
  }, 2000);
  
})();

// 导出修复状态检查函数
window.getFixStatus = function() {
  return {
    mediaDevices: !!navigator.mediaDevices,
    getUserMedia: !!navigator.mediaDevices?.getUserMedia,
    mediaRecorder: !!window.MediaRecorder,
    webSocket: !!window.WebSocket,
    audioContext: !!(window.AudioContext || window.webkitAudioContext),
    timestamp: new Date().toISOString()
  };
};

console.log('Chrome 138 修复脚本加载完成');
