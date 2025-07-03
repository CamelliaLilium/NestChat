/**
 * 浏览器兼容性检测工具
 * 检测语音录制、WebSocket等功能的支持情况
 */

class BrowserCompatibility {
  constructor() {
    this.results = {};
  }

  /**
   * 检测语音录制支持
   */
  checkAudioRecording() {
    const results = {
      supported: true,
      issues: [],
      recommendations: []
    };

    // 检查MediaDevices API
    if (!navigator.mediaDevices) {
      results.supported = false;
      results.issues.push('MediaDevices API不支持');
      results.recommendations.push('请使用Chrome 53+、Firefox 36+、Safari 11+或Edge 79+');
    }

    // 检查getUserMedia
    if (!navigator.mediaDevices?.getUserMedia) {
      results.supported = false;
      results.issues.push('getUserMedia不支持');
      results.recommendations.push('请更新浏览器到最新版本');
    }

    // 检查MediaRecorder
    if (!window.MediaRecorder) {
      results.supported = false;
      results.issues.push('MediaRecorder API不支持');
      results.recommendations.push('请使用Chrome 47+、Firefox 25+或Safari 14.1+');
    }

    // 检查HTTPS要求
    if (location.protocol !== 'https:' && 
        location.hostname !== 'localhost' && 
        location.hostname !== '127.0.0.1') {
      results.issues.push('非HTTPS环境可能限制录音功能');
      results.recommendations.push('建议在HTTPS环境下使用录音功能');
    }

    this.results.audioRecording = results;
    return results;
  }

  /**
   * 检测WebSocket支持
   */
  checkWebSocket() {
    const results = {
      supported: true,
      issues: [],
      recommendations: []
    };

    if (!window.WebSocket) {
      results.supported = false;
      results.issues.push('WebSocket不支持');
      results.recommendations.push('请使用现代浏览器');
    }

    this.results.webSocket = results;
    return results;
  }

  /**
   * 检测浏览器信息
   */
  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';

    if (ua.includes('Chrome')) {
      browser = 'Chrome';
      const match = ua.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
      const match = ua.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = 'Safari';
      const match = ua.match(/Version\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (ua.includes('Edge')) {
      browser = 'Edge';
      const match = ua.match(/Edge\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    }

    const info = {
      browser,
      version,
      userAgent: ua,
      platform: navigator.platform,
      language: navigator.language
    };

    this.results.browserInfo = info;
    return info;
  }

  /**
   * 综合检测
   */
  runAllChecks() {
    const browserInfo = this.getBrowserInfo();
    const audioRecording = this.checkAudioRecording();
    const webSocket = this.checkWebSocket();

    const summary = {
      browserInfo,
      audioRecording,
      webSocket,
      overallCompatible: audioRecording.supported && webSocket.supported,
      timestamp: new Date().toISOString()
    };

    this.results.summary = summary;
    return summary;
  }

  /**
   * 生成兼容性报告
   */
  generateReport() {
    const summary = this.runAllChecks();
    
    let report = '=== NestChat 浏览器兼容性报告 ===\n\n';
    
    // 浏览器信息
    report += '🌐 浏览器信息:\n';
    report += `  浏览器: ${summary.browserInfo.browser} ${summary.browserInfo.version}\n`;
    report += `  平台: ${summary.browserInfo.platform}\n`;
    report += `  语言: ${summary.browserInfo.language}\n\n`;
    
    // 语音录制支持
    report += '🎤 语音录制支持:\n';
    report += `  状态: ${summary.audioRecording.supported ? '✅ 支持' : '❌ 不支持'}\n`;
    if (summary.audioRecording.issues.length > 0) {
      report += `  问题: ${summary.audioRecording.issues.join(', ')}\n`;
      report += `  建议: ${summary.audioRecording.recommendations.join(', ')}\n`;
    }
    report += '\n';
    
    // WebSocket支持
    report += '🔌 WebSocket支持:\n';
    report += `  状态: ${summary.webSocket.supported ? '✅ 支持' : '❌ 不支持'}\n`;
    if (summary.webSocket.issues.length > 0) {
      report += `  问题: ${summary.webSocket.issues.join(', ')}\n`;
      report += `  建议: ${summary.webSocket.recommendations.join(', ')}\n`;
    }
    report += '\n';
    
    // 总体兼容性
    report += '📊 总体兼容性:\n';
    report += `  状态: ${summary.overallCompatible ? '✅ 完全兼容' : '⚠️ 部分功能受限'}\n`;
    
    if (!summary.overallCompatible) {
      report += '\n💡 推荐的浏览器版本:\n';
      report += '  - Chrome 88+ (推荐)\n';
      report += '  - Firefox 78+\n';
      report += '  - Safari 14.1+\n';
      report += '  - Edge 88+\n';
    }
    
    report += `\n⏰ 检测时间: ${new Date().toLocaleString()}\n`;
    
    return report;
  }

  /**
   * 显示兼容性弹窗
   */
  showCompatibilityDialog() {
    const report = this.generateReport();
    
    // 创建弹窗
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #e91e63;
      border-radius: 10px;
      padding: 20px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 10000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      font-family: monospace;
      font-size: 12px;
      line-height: 1.4;
    `;
    
    dialog.innerHTML = `
      <div style="text-align: center; margin-bottom: 15px;">
        <h3 style="color: #e91e63; margin: 0;">浏览器兼容性检测</h3>
      </div>
      <pre style="white-space: pre-wrap; margin: 0;">${report}</pre>
      <div style="text-align: center; margin-top: 15px;">
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #e91e63;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
        ">关闭</button>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // 3秒后自动关闭（可选）
    setTimeout(() => {
      if (dialog.parentElement) {
        dialog.remove();
      }
    }, 10000);
  }
}

// 创建全局实例
const browserCompatibility = new BrowserCompatibility();

export default browserCompatibility;
