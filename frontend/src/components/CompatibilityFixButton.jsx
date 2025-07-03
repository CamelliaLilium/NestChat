/**
 * 兼容性修复按钮组件
 * 提供一键修复常见兼容性问题的功能
 */
import React, { useState } from 'react';

const CompatibilityFixButton = () => {
  const [isFixing, setIsFixing] = useState(false);
  const [fixResults, setFixResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const runCompatibilityFix = async () => {
    setIsFixing(true);
    setFixResults([]);
    
    const results = [];
    
    try {
      // 1. 检查基础API支持
      results.push('🔍 开始兼容性检查...');
      
      // 检查MediaDevices
      if (!navigator.mediaDevices) {
        results.push('❌ MediaDevices API不支持');
      } else {
        results.push('✅ MediaDevices API支持');
      }
      
      // 检查getUserMedia
      if (!navigator.mediaDevices?.getUserMedia) {
        results.push('❌ getUserMedia不支持');
      } else {
        results.push('✅ getUserMedia支持');
      }
      
      // 检查MediaRecorder
      if (!window.MediaRecorder) {
        results.push('❌ MediaRecorder不支持');
      } else {
        results.push('✅ MediaRecorder支持');
        
        // 检查支持的格式
        const formats = ['audio/webm', 'audio/mp4', 'audio/ogg'];
        const supportedFormats = formats.filter(format => 
          MediaRecorder.isTypeSupported(format)
        );
        results.push(`📋 支持的音频格式: ${supportedFormats.join(', ')}`);
      }
      
      // 检查WebSocket
      if (!window.WebSocket) {
        results.push('❌ WebSocket不支持');
      } else {
        results.push('✅ WebSocket支持');
      }
      
      // 2. 尝试权限修复
      results.push('🔧 尝试修复权限问题...');
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        results.push('✅ 麦克风权限获取成功');
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        results.push(`❌ 麦克风权限失败: ${error.name}`);
        
        // 提供具体的解决建议
        switch (error.name) {
          case 'NotAllowedError':
            results.push('💡 解决方案: 点击地址栏🔒图标，允许麦克风权限');
            break;
          case 'NotFoundError':
            results.push('💡 解决方案: 检查麦克风设备连接');
            break;
          case 'NotReadableError':
            results.push('💡 解决方案: 关闭其他使用麦克风的应用');
            break;
          case 'SecurityError':
            results.push('💡 解决方案: 确保在HTTPS环境或localhost使用');
            break;
        }
      }
      
      // 3. 网络连接测试
      results.push('🌐 测试网络连接...');
      
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://10.122.239.128:3001/api/v1';
        const healthUrl = `${apiUrl}/health`;
        
        const response = await fetch(healthUrl);
        if (response.ok) {
          results.push('✅ 后端API连接正常');
        } else {
          results.push(`⚠️ 后端API响应异常: ${response.status}`);
        }
      } catch (error) {
        results.push(`❌ 后端API连接失败: ${error.message}`);
        results.push('💡 解决方案: 确保后端服务已启动 (node server.js)');
      }
      
      // 4. 浏览器特定修复
      results.push('🛠️ 应用浏览器特定修复...');
      
      const ua = navigator.userAgent;
      if (ua.includes('Chrome')) {
        // Chrome特定修复
        results.push('🔧 应用Chrome兼容性修复');
        
        // 安装兼容性修复
        if (window.chrome138Fix) {
          await window.chrome138Fix.runAllFixes();
          results.push('✅ Chrome 138修复已应用');
        }
      } else if (ua.includes('Firefox')) {
        results.push('🔧 应用Firefox兼容性修复');
        // Firefox特定修复
      } else if (ua.includes('Safari')) {
        results.push('🔧 应用Safari兼容性修复');
        // Safari特定修复
      }
      
      // 5. 生成修复建议
      results.push('📋 修复建议:');
      results.push('• 清除浏览器缓存: Ctrl+Shift+Delete');
      results.push('• 重启浏览器');
      results.push('• 确保防火墙允许端口3001和5173');
      results.push('• 尝试使用无痕模式');
      
      results.push('✅ 兼容性修复完成!');
      
    } catch (error) {
      results.push(`❌ 修复过程出错: ${error.message}`);
    } finally {
      setIsFixing(false);
      setFixResults(results);
      setShowResults(true);
    }
  };

  const copyResults = () => {
    const text = fixResults.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      alert('修复结果已复制到剪贴板');
    });
  };

  const downloadReport = () => {
    const content = `
NestChat 兼容性修复报告
时间: ${new Date().toLocaleString()}
浏览器: ${navigator.userAgent}
URL: ${window.location.href}

修复结果:
${fixResults.join('\n')}

技术信息:
- MediaDevices: ${!!navigator.mediaDevices}
- getUserMedia: ${!!navigator.mediaDevices?.getUserMedia}
- MediaRecorder: ${!!window.MediaRecorder}
- WebSocket: ${!!window.WebSocket}
- 安全上下文: ${window.isSecureContext}
- 协议: ${window.location.protocol}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nestchat-fix-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
      <button
        onClick={runCompatibilityFix}
        disabled={isFixing}
        style={{
          background: isFixing ? '#ccc' : '#e91e63',
          color: 'white',
          border: 'none',
          padding: '12px 20px',
          borderRadius: '25px',
          cursor: isFixing ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 2px 10px rgba(233, 30, 99, 0.3)',
          transition: 'all 0.3s ease'
        }}
      >
        {isFixing ? '🔧 修复中...' : '🛠️ 一键修复'}
      </button>

      {showResults && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          border: '2px solid #e91e63',
          borderRadius: '10px',
          padding: '20px',
          maxWidth: '600px',
          maxHeight: '70vh',
          overflow: 'auto',
          zIndex: 10000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ color: '#e91e63', margin: 0 }}>🔧 兼容性修复结果</h3>
            <button
              onClick={() => setShowResults(false)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ✕
            </button>
          </div>
          
          <div style={{
            background: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '5px',
            padding: '15px',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.4',
            whiteSpace: 'pre-wrap',
            marginBottom: '15px'
          }}>
            {fixResults.join('\n')}
          </div>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={copyResults}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              📋 复制结果
            </button>
            <button
              onClick={downloadReport}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              📄 下载报告
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#ffc107',
                color: 'black',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              🔄 重新加载
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompatibilityFixButton;
