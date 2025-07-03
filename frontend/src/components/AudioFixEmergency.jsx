/**
 * 录音功能应急修复组件
 * 当检测到录音功能问题时自动显示修复界面
 */
import React, { useState, useEffect } from 'react';

const AudioFixEmergency = () => {
  const [showFix, setShowFix] = useState(false);
  const [fixStatus, setFixStatus] = useState('checking');
  const [fixResults, setFixResults] = useState([]);

  useEffect(() => {
    // 延迟检查，确保所有修复脚本已加载
    setTimeout(() => {
      checkAudioSupport();
    }, 1000);
  }, []);

  const checkAudioSupport = async () => {
    console.log('🔍 应急检查音频支持...');
    
    const issues = [];
    
    // 检查基础API
    if (!navigator.mediaDevices) {
      issues.push('MediaDevices API缺失');
    }
    
    if (!navigator.mediaDevices?.getUserMedia) {
      issues.push('getUserMedia API缺失');
    }
    
    if (!window.MediaRecorder) {
      issues.push('MediaRecorder API缺失');
    }
    
    // 如果有问题，显示修复界面
    if (issues.length > 0) {
      setFixResults(issues);
      setShowFix(true);
      setFixStatus('error');
    } else {
      // 尝试实际测试录音
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setFixStatus('success');
        console.log('✅ 音频功能正常');
      } catch (error) {
        setFixResults([`录音测试失败: ${error.name}`]);
        setShowFix(true);
        setFixStatus('error');
      }
    }
  };

  const runEmergencyFix = async () => {
    setFixStatus('fixing');
    const results = [];
    
    try {
      // 1. 强制重新加载修复脚本
      if (window.testRecording) {
        const testResult = await window.testRecording();
        if (testResult.success) {
          results.push('✅ 录音测试通过');
          setFixStatus('success');
        } else {
          results.push(`❌ 录音测试失败: ${testResult.error}`);
        }
      }
      
      // 2. 检查修复状态
      if (window.getFixStatus) {
        const status = window.getFixStatus();
        results.push(`MediaDevices: ${status.mediaDevices ? '✅' : '❌'}`);
        results.push(`getUserMedia: ${status.getUserMedia ? '✅' : '❌'}`);
        results.push(`MediaRecorder: ${status.mediaRecorder ? '✅' : '❌'}`);
      }
      
      // 3. 尝试权限重置
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        results.push('✅ 权限获取成功');
        setFixStatus('success');
      } catch (permError) {
        results.push(`❌ 权限失败: ${permError.name}`);
      }
      
    } catch (error) {
      results.push(`❌ 修复过程错误: ${error.message}`);
    }
    
    setFixResults(results);
  };

  const forceReload = () => {
    // 清除所有缓存
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // 强制重新加载
    window.location.reload(true);
  };

  const showDetailedHelp = () => {
    const helpWindow = window.open('', '_blank', 'width=600,height=800,scrollbars=yes');
    helpWindow.document.write(`
      <html>
        <head>
          <title>Chrome 138 录音问题解决方案</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .solution { background: #f0f8ff; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .warning { background: #fff3cd; padding: 15px; margin: 10px 0; border-radius: 5px; }
            code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <h1>🔧 Chrome 138 录音问题解决方案</h1>
          
          <div class="warning">
            <strong>⚠️ 当前问题:</strong> Chrome 138 在某些环境下MediaDevices API不可用
          </div>
          
          <div class="solution">
            <h3>解决方案 1: 重置Chrome设置</h3>
            <ol>
              <li>打开Chrome设置: <code>chrome://settings/</code></li>
              <li>点击"高级" → "重置并清理"</li>
              <li>选择"将设置还原为原始默认设置"</li>
              <li>重启Chrome</li>
            </ol>
          </div>
          
          <div class="solution">
            <h3>解决方案 2: 命令行启动Chrome</h3>
            <p>以管理员身份运行以下命令:</p>
            <code style="display: block; padding: 10px; background: #000; color: #0f0;">
chrome.exe --unsafely-treat-insecure-origin-as-secure=http://10.122.239.128:5173 
--disable-web-security --user-data-dir=temp --allow-running-insecure-content
            </code>
          </div>
          
          <div class="solution">
            <h3>解决方案 3: 使用其他浏览器</h3>
            <ul>
              <li>Firefox (推荐)</li>
              <li>Edge</li>
              <li>Safari (macOS)</li>
            </ul>
          </div>
          
          <div class="solution">
            <h3>解决方案 4: 检查企业策略</h3>
            <ol>
              <li>访问: <code>chrome://policy/</code></li>
              <li>检查是否有阻止媒体访问的策略</li>
              <li>联系IT管理员解除限制</li>
            </ol>
          </div>
          
          <div class="solution">
            <h3>解决方案 5: 手动启用功能</h3>
            <ol>
              <li>访问: <code>chrome://flags/</code></li>
              <li>搜索并启用:</li>
              <ul>
                <li><code>Experimental Web Platform features</code></li>
                <li><code>Insecure origins treated as secure</code></li>
              </ul>
              <li>重启Chrome</li>
            </ol>
          </div>
          
          <button onclick="window.close()" style="
            background: #e91e63; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer;
            margin-top: 20px;
          ">关闭</button>
        </body>
      </html>
    `);
  };

  if (!showFix) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '15px',
        padding: '30px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#e91e63', margin: 0 }}>
            🚨 录音功能异常
          </h2>
          <p style={{ color: '#666', marginTop: '10px' }}>
            检测到Chrome 138兼容性问题
          </p>
        </div>

        <div style={{
          background: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          fontFamily: 'monospace',
          fontSize: '13px'
        }}>
          {fixResults.map((result, index) => (
            <div key={index} style={{ margin: '5px 0' }}>
              {result}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={runEmergencyFix}
            disabled={fixStatus === 'fixing'}
            style={{
              background: fixStatus === 'fixing' ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              cursor: fixStatus === 'fixing' ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {fixStatus === 'fixing' ? '🔧 修复中...' : '🛠️ 尝试自动修复'}
          </button>

          <button
            onClick={forceReload}
            style={{
              background: '#ffc107',
              color: '#212529',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🔄 强制刷新页面
          </button>

          <button
            onClick={showDetailedHelp}
            style={{
              background: '#17a2b8',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            📚 查看详细解决方案
          </button>

          {fixStatus === 'success' && (
            <button
              onClick={() => setShowFix(false)}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ✅ 继续使用
            </button>
          )}
        </div>

        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: '#e9f7ef', 
          borderRadius: '8px',
          fontSize: '12px',
          color: '#155724'
        }}>
          <strong>💡 快速解决:</strong><br/>
          1. 尝试使用Firefox浏览器<br/>
          2. 确保在HTTPS环境或localhost使用<br/>
          3. 检查麦克风权限设置<br/>
          4. 清除浏览器缓存后重试
        </div>
      </div>
    </div>
  );
};

export default AudioFixEmergency;
