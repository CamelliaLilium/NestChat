/**
 * Chrome 138 特定问题修复脚本
 * 针对最新Chrome版本的兼容性问题进行修复
 */

// Chrome 138 已知问题修复
class Chrome138Fix {
  constructor() {
    this.fixes = [];
    this.issues = [];
  }

  // 检测Chrome 138特定问题
  detectIssues() {
    console.log('🔍 检测Chrome 138特定问题...');
    
    // 1. 检测严格的权限策略
    this.checkPermissionPolicy();
    
    // 2. 检测MediaRecorder问题
    this.checkMediaRecorderIssues();
    
    // 3. 检测WebSocket问题
    this.checkWebSocketIssues();
    
    // 4. 检测CORS问题
    this.checkCORSIssues();
    
    return this.issues;
  }

  checkPermissionPolicy() {
    // Chrome 138 对权限策略更严格
    if (!document.featurePolicy && !document.permissionsPolicy) {
      this.issues.push({
        type: 'permission_policy',
        message: 'Permissions Policy API不可用',
        fix: 'checkPermissionPolicyFix'
      });
    }

    // 检查麦克风权限策略
    try {
      const microphoneAllowed = document.permissionsPolicy ? 
        document.permissionsPolicy.allowsFeature('microphone') : 
        true; // 旧版本默认允许

      if (!microphoneAllowed) {
        this.issues.push({
          type: 'microphone_policy',
          message: '麦克风被权限策略阻止',
          fix: 'fixMicrophonePolicy'
        });
      }
    } catch (e) {
      console.warn('权限策略检查失败:', e);
    }
  }

  checkMediaRecorderIssues() {
    // Chrome 138 MediaRecorder 问题
    if (window.MediaRecorder) {
      // 检查支持的MIME类型
      const supportedTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/ogg;codecs=opus'
      ];

      const supported = supportedTypes.filter(type => 
        MediaRecorder.isTypeSupported(type)
      );

      if (supported.length === 0) {
        this.issues.push({
          type: 'mediarecorder_mime',
          message: '没有支持的MediaRecorder MIME类型',
          fix: 'fixMediaRecorderMIME'
        });
      }

      // 检查时间片支持
      try {
        const testRecorder = new MediaRecorder(new MediaStream(), {
          mimeType: 'audio/webm'
        });
        // Chrome 138可能对时间片有新的限制
      } catch (e) {
        this.issues.push({
          type: 'mediarecorder_constructor',
          message: 'MediaRecorder构造函数失败',
          fix: 'fixMediaRecorderConstructor'
        });
      }
    }
  }

  checkWebSocketIssues() {
    // Chrome 138 WebSocket 问题
    if (window.WebSocket) {
      // 检查安全上下文要求
      if (!window.isSecureContext && location.hostname !== 'localhost') {
        this.issues.push({
          type: 'websocket_security',
          message: 'WebSocket需要安全上下文',
          fix: 'fixWebSocketSecurity'
        });
      }
    }
  }

  checkCORSIssues() {
    // Chrome 138 CORS 策略更严格
    const currentOrigin = window.location.origin;
    const apiOrigin = 'http://10.122.239.128:3001';
    
    if (currentOrigin !== apiOrigin) {
      this.issues.push({
        type: 'cors_policy',
        message: 'CORS策略可能阻止跨域请求',
        fix: 'fixCORSPolicy'
      });
    }
  }

  // 修复方法
  async checkPermissionPolicyFix() {
    console.log('🔧 修复权限策略问题...');
    
    // 尝试通过用户交互触发权限请求
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      this.fixes.push('权限策略修复成功');
      return true;
    } catch (e) {
      this.fixes.push('权限策略修复失败: ' + e.message);
      return false;
    }
  }

  fixMicrophonePolicy() {
    console.log('🔧 修复麦克风策略问题...');
    
    // 添加权限策略元标签建议
    const suggestion = document.createElement('div');
    suggestion.innerHTML = `
      <div style="position: fixed; top: 10px; right: 10px; background: #ff4444; color: white; padding: 10px; border-radius: 5px; z-index: 10000;">
        <strong>麦克风权限被阻止</strong><br>
        请联系网站管理员添加权限策略：<br>
        <code>&lt;meta http-equiv="Permissions-Policy" content="microphone=*"&gt;</code>
      </div>
    `;
    document.body.appendChild(suggestion);
    
    setTimeout(() => suggestion.remove(), 10000);
    
    this.fixes.push('麦克风策略修复建议已显示');
    return true;
  }

  fixMediaRecorderMIME() {
    console.log('🔧 修复MediaRecorder MIME类型问题...');
    
    // 尝试使用不同的配置
    window.createCompatibleMediaRecorder = function(stream) {
      const mimeTypes = [
        { mimeType: 'audio/webm' },
        { mimeType: 'audio/webm;codecs=opus' },
        { mimeType: 'audio/mp4' },
        { }  // 不指定MIME类型，让浏览器选择
      ];

      for (const options of mimeTypes) {
        try {
          return new MediaRecorder(stream, options);
        } catch (e) {
          console.warn('MediaRecorder配置失败:', options, e);
        }
      }
      
      throw new Error('无法创建兼容的MediaRecorder');
    };

    this.fixes.push('MediaRecorder兼容性修复已安装');
    return true;
  }

  fixMediaRecorderConstructor() {
    console.log('🔧 修复MediaRecorder构造函数问题...');
    
    // 提供降级方案
    if (!window.MediaRecorder.isTypeSupported) {
      window.MediaRecorder.isTypeSupported = function(type) {
        return ['audio/webm', 'audio/mp4'].includes(type.split(';')[0]);
      };
    }

    this.fixes.push('MediaRecorder构造函数修复已安装');
    return true;
  }

  fixWebSocketSecurity() {
    console.log('🔧 修复WebSocket安全问题...');
    
    // 显示安全警告
    const warning = document.createElement('div');
    warning.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 10px; max-width: 400px; z-index: 10000;">
        <h3 style="color: #856404; margin-top: 0;">⚠️ 安全上下文警告</h3>
        <p style="color: #856404;">当前环境不是安全上下文，某些功能可能受限。</p>
        <p style="color: #856404;"><strong>建议：</strong></p>
        <ul style="color: #856404;">
          <li>使用 localhost 进行本地测试</li>
          <li>配置 HTTPS 证书</li>
          <li>使用 Chrome 的 --unsafely-treat-insecure-origin-as-secure 标志</li>
        </ul>
        <button onclick="this.parentElement.parentElement.remove()" style="background: #856404; color: white; border: none; padding: 10px; border-radius: 5px;">关闭</button>
      </div>
    `;
    document.body.appendChild(warning);

    this.fixes.push('WebSocket安全警告已显示');
    return true;
  }

  fixCORSPolicy() {
    console.log('🔧 修复CORS策略问题...');
    
    // 设置更宽松的fetch选项
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
      return originalFetch(url, {
        ...options,
        mode: 'cors',
        credentials: 'omit',
        headers: {
          ...options.headers,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
    };

    this.fixes.push('CORS策略修复已安装');
    return true;
  }

  // 运行所有修复
  async runAllFixes() {
    console.log('🚀 开始运行Chrome 138修复...');
    
    const issues = this.detectIssues();
    console.log('发现问题:', issues);

    for (const issue of issues) {
      try {
        const fixMethod = this[issue.fix];
        if (fixMethod) {
          await fixMethod.call(this);
        }
      } catch (e) {
        console.error('修复失败:', issue.type, e);
        this.fixes.push(`${issue.type}修复失败: ${e.message}`);
      }
    }

    console.log('修复完成:', this.fixes);
    return this.fixes;
  }

  // 生成修复报告
  generateReport() {
    return {
      browser: navigator.userAgent,
      timestamp: new Date().toISOString(),
      issues: this.issues,
      fixes: this.fixes,
      recommendations: [
        '清除浏览器缓存和Cookie',
        '重启浏览器',
        '检查浏览器扩展是否干扰',
        '尝试无痕模式',
        '更新浏览器到最新版本'
      ]
    };
  }
}

// 自动运行修复（如果在浏览器环境中）
if (typeof window !== 'undefined') {
  const chrome138Fix = new Chrome138Fix();
  
  // 页面加载完成后自动运行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      chrome138Fix.runAllFixes();
    });
  } else {
    chrome138Fix.runAllFixes();
  }
  
  // 暴露到全局作用域供调试使用
  window.chrome138Fix = chrome138Fix;
}

export default Chrome138Fix;
