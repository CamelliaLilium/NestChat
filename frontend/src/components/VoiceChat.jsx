import React, { useState, useEffect, useRef } from 'react'; // 导入 React 库，以及 useState, useEffect, useRef Hooks

const VoiceChatModal = ({ isOpen, onClose, onSendVoice }) => {
  const [isRecording, setIsRecording] = useState(false); // 录制状态：true 表示正在录制，false 表示停止
  const [recordingTime, setRecordingTime] = useState(0); // 录制时长：单位为秒
  const [audioData, setAudioData] = useState(null); // 存储录制到的音频数据（目前为模拟数据）
  const [waveformValue, setWaveformValue] = useState(0); // 语音波动值 (0-100)，用于模拟音量大小

  const mediaRecorderRef = useRef(null); // 用于存储 MediaRecorder 实例的引用
  const audioChunksRef = useRef([]); // 用于存储录制到的音频数据块

  // useEffect 用于处理录制计时和语音波动模拟
  useEffect(() => {
    let timer;
    let waveformTimer;

    if (isRecording) {
      // 如果正在录制
      timer = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1); // 每秒增加录制时长
      }, 1000);

      waveformTimer = setInterval(() => {
        // 模拟语音波动：实际应用中，这里会根据麦克风的实时音量数据来更新 waveformValue
        // 例如：使用 AudioContext API 获取音频流的 FFT 数据，计算平均音量
        setWaveformValue(Math.floor(Math.random() * 80) + 20); // 生成 20-100 之间的随机值模拟波动
      }, 100); // 每100毫秒更新波动

    } else {
      // 如果停止录制
      clearInterval(timer); // 清除录制时长定时器
      clearInterval(waveformTimer); // 清除语音波动定时器
      setWaveformValue(0); // 停止录制时波动归零
    }

    // 清理函数：组件卸载或 isRecording 状态改变时清除定时器
    return () => {
      clearInterval(timer);
      clearInterval(waveformTimer);
    };
  }, [isRecording]); // 依赖 isRecording 状态，当它改变时重新运行 effect

  // useEffect 用于在弹窗关闭时清除录音数据
  useEffect(() => {
    if (!isOpen) {
      // 如果弹窗关闭 (isOpen 为 false)
      setIsRecording(false); // 确保录制状态为停止
      setRecordingTime(0); // 重置录制时长
      setAudioData(null); // 清除之前录制到的音频数据
      audioChunksRef.current = []; // 清空音频数据块
      // 实际应用中，如果 MediaRecorder 还在运行，需要在这里停止它
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      console.log("弹窗关闭，已清除之前的录音数据。");
    }
  }, [isOpen]); // 依赖 isOpen 状态，当它改变时重新运行 effect

  // 处理开始录制
  const handleStartRecording = async () => {
    try {
      console.log('开始检查录音兼容性...');
      
      // 1. 检查基础API支持 - 增强检测
      if (!navigator.mediaDevices) {
        // 尝试使用旧版API作为fallback
        if (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia) {
          console.warn('使用旧版getUserMedia API');
          return await handleLegacyRecording();
        }
        throw new Error('MediaDevices_API_NOT_SUPPORTED');
      }
      
      if (!navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia_NOT_SUPPORTED');
      }
      
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder_NOT_SUPPORTED');
      }
      
      // 2. 检查权限状态
      if (navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
          console.log('麦克风权限状态:', permissionStatus.state);
          
          if (permissionStatus.state === 'denied') {
            throw new Error('PERMISSION_DENIED');
          }
        } catch (permError) {
          console.warn('权限查询失败:', permError);
        }
      }
      
      // 3. 检查HTTPS要求（在非localhost环境下）
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        console.warn('录音功能需要HTTPS环境或localhost环境');
      }
      
      console.log('开始请求麦克风权限...');
      
      // 4. 使用更宽松的约束请求麦克风权限
      const constraints = {
        audio: {
          echoCancellation: false,  // 简化约束
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 1
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('麦克风权限获取成功，开始录制...');
      
      // 5. 尝试不同的MediaRecorder配置
      let recorderOptions = null;
      const mimeTypes = [
        { mimeType: 'audio/webm' },
        { mimeType: 'audio/webm;codecs=opus' },
        { mimeType: 'audio/mp4' },
        { }  // 无配置，让浏览器自动选择
      ];
      
      for (const options of mimeTypes) {
        try {
          mediaRecorderRef.current = new MediaRecorder(stream, options);
          recorderOptions = options;
          console.log('使用MediaRecorder配置:', options);
          break;
        } catch (e) {
          console.warn('MediaRecorder配置失败:', options, e);
        }
      }
      
      if (!mediaRecorderRef.current) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('MediaRecorder_CONSTRUCTOR_FAILED');
      }
      
      audioChunksRef.current = []; // 每次开始录制前清空数据块

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data); // 收集音频数据块
      };

      mediaRecorderRef.current.onstop = () => {
        // 当录制停止时，将所有数据块合并成一个 Blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // 在这里可以将 audioBlob 转换为 base64 或直接用于上传
        setAudioData(audioBlob); // 存储录制到的实际音频 Blob
        console.log("录音停止，音频数据已准备好。");
        // 停止麦克风流
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(); // 启动录制
      setIsRecording(true); // 设置录制状态为 true
      setRecordingTime(0); // 重置录制时长
      setAudioData(null); // 清除之前的录音数据
      console.log("开始录制语音...");
    } catch (error) {
      console.error("录音启动失败:", error);
      
      // 根据错误类型提供具体的解决方案
      let errorMessage = '';
      let solution = '';
      
      switch (error.message) {
        case 'MediaDevices_API_NOT_SUPPORTED':
          errorMessage = '您的浏览器不支持MediaDevices API';
          solution = '请使用Chrome 53+、Firefox 36+、Safari 11+或Edge 79+';
          break;
        case 'getUserMedia_NOT_SUPPORTED':
          errorMessage = '您的浏览器不支持getUserMedia功能';
          solution = '请更新浏览器到最新版本或换用Chrome/Firefox';
          break;
        case 'MediaRecorder_NOT_SUPPORTED':
          errorMessage = '您的浏览器不支持MediaRecorder API';
          solution = '请使用Chrome 47+、Firefox 25+或Safari 14.1+';
          break;
        default:
          if (error.name === 'NotAllowedError') {
            errorMessage = '麦克风权限被拒绝';
            solution = '请点击地址栏的🔒图标，允许麦克风权限，然后刷新页面重试';
          } else if (error.name === 'NotFoundError') {
            errorMessage = '未检测到麦克风设备';
            solution = '请检查麦克风是否正确连接，或在系统设置中启用麦克风';
          } else if (error.name === 'NotReadableError') {
            errorMessage = '麦克风被其他应用占用';
            solution = '请关闭其他使用麦克风的应用，然后重试';
          } else if (error.name === 'OverconstrainedError') {
            errorMessage = '麦克风不支持请求的参数';
            solution = '您的麦克风可能过于老旧，请尝试使用其他设备';
          } else if (error.name === 'SecurityError') {
            errorMessage = '安全限制阻止了录音功能';
            solution = '请确保在HTTPS环境下使用，或使用localhost进行测试';
          } else {
            errorMessage = '录音功能启动失败';
            solution = `错误详情: ${error.message}`;
          }
      }
      
      alert(`❌ ${errorMessage}\n\n💡 解决方案: ${solution}`);
    }
  };

  // 处理结束录制
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop(); // 停止 MediaRecorder 录制
    }
    setIsRecording(false); // 设置录制状态为 false
    console.log("结束录制语音。");
  };

  // 处理发送语音
  const handleSend = () => {
    if (audioData) {
      onSendVoice(audioData); // 调用父组件传入的发送语音回调，传递实际的音频 Blob
      onClose(); // 关闭弹窗
    } else {
      console.log("没有录音数据可发送。");
      // 可以添加一个提示弹窗告知用户没有录音
    }
  };

  // 格式化时间：将秒数转换为 MM:SS 格式
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null; // 如果弹窗不打开，则不渲染任何内容

  // 样式定义
  const overlayStyle = {
    position: 'fixed', // 固定定位，覆盖整个视口
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // 半透明黑色背景，形成遮罩
    display: 'flex', // flex 布局用于居中模态框
    alignItems: 'center', // 垂直居中
    justifyContent: 'center', // 水平居中
    zIndex: 1000, // 确保在最上层
  };

  const modalStyle = {
    backgroundColor: '#ffffff', // 白色背景
    borderRadius: '16px', // 圆角
    padding: '30px', // 内边距
    width: '90%', // 宽度占父容器的 90%
    maxWidth: '400px', // 最大宽度
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)', // 阴影效果
    display: 'flex', // flex 布局
    flexDirection: 'column', // 垂直排列
    alignItems: 'center', // 水平居中
    gap: '20px', // 元素间距
    position: 'relative', // 相对定位，用于内部绝对定位元素
  };

  const titleStyle = {
    fontSize: '22px', // 标题字体大小
    fontWeight: '600', // 字体粗细
    color: '#e91e63', // 标题颜色
    marginBottom: '10px', // 底部外边距
  };

  const recordingStatusStyle = {
    fontSize: '18px', // 状态文本字体大小
    color: isRecording ? '#4caf50' : '#616161', // 录制中显示绿色，否则显示灰色
    fontWeight: 'bold', // 字体加粗
  };

  const timerStyle = {
    fontSize: '24px', // 时间字体大小
    fontWeight: 'bold', // 字体加粗
    color: '#333333', // 文本颜色
    fontVariantNumeric: 'tabular-nums', // 确保数字等宽，防止跳动
  };

  const waveformContainerStyle = {
    width: '100%', // 宽度占满
    height: '60px', // 固定高度
    backgroundColor: '#f0f0f0', // 背景色
    borderRadius: '8px', // 圆角
    display: 'flex', // flex 布局
    alignItems: 'center', // 垂直居中
    justifyContent: 'center', // 水平居中
    overflow: 'hidden', // 隐藏超出部分
    position: 'relative', // 相对定位
  };

  // 语音波动条样式
  const waveformBarStyle = {
    width: '4px', // 条形宽度
    // height: `${waveformValue}px`, // 高度根据波动值变化 (原模拟方式)
    backgroundColor: '#e91e63', // 颜色
    borderRadius: '2px', // 圆角
    margin: '0 1px', // 间距
    transition: 'height 0.1s ease-out', // 平滑过渡
  };

  const buttonContainerStyle = {
    display: 'flex', // flex 布局
    gap: '15px', // 按钮间距
    width: '100%', // 宽度占满
    justifyContent: 'center', // 水平居中
  };

  const buttonStyle = {
    padding: '12px 24px', // 内边距
    borderRadius: '10px', // 圆角
    border: 'none', // 无边框
    fontSize: '16px', // 字体大小
    fontWeight: '500', // 字体粗细
    cursor: 'pointer', // 鼠标指针
    transition: 'all 0.2s ease', // 过渡效果
    flex: 1, // 按钮平分空间
  };

  const startButtonStyle = {
    ...buttonStyle, // 继承通用按钮样式
    backgroundColor: '#4caf50', // 绿色背景
    color: '#ffffff', // 白色文本
  };

  const stopButtonStyle = {
    ...buttonStyle, // 继承通用按钮样式
    backgroundColor: '#f44336', // 红色背景
    color: '#ffffff', // 白色文本
  };

  const sendButtonStyle = {
    ...buttonStyle, // 继承通用按钮样式
    backgroundColor: '#e91e63', // 粉色背景
    color: '#ffffff', // 白色文本
  };

  const closeButtonStyle = {
    position: 'absolute', // 绝对定位
    top: '15px', // 距离顶部
    right: '15px', // 距离右侧
    backgroundColor: 'transparent', // 透明背景
    border: 'none', // 无边框
    fontSize: '24px', // 字体大小
    cursor: 'pointer', // 鼠标指针
    color: '#9e9e9e', // 颜色
    transition: 'color 0.2s ease', // 过渡效果
  };

  // 旧版getUserMedia API的fallback实现
  const handleLegacyRecording = async () => {
    return new Promise((resolve, reject) => {
      console.log('尝试使用旧版getUserMedia API...');
      
      // 获取旧版getUserMedia
      const getUserMedia = navigator.getUserMedia || 
                          navigator.webkitGetUserMedia || 
                          navigator.mozGetUserMedia || 
                          navigator.msGetUserMedia;
      
      if (!getUserMedia) {
        reject(new Error('NO_GETUSERMEDIA_SUPPORT'));
        return;
      }
      
      getUserMedia.call(navigator, 
        { audio: true },
        (stream) => {
          console.log('旧版getUserMedia成功');
          
          try {
            if (!window.MediaRecorder) {
              throw new Error('MediaRecorder_NOT_SUPPORTED');
            }
            
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            
            mediaRecorderRef.current.ondataavailable = (event) => {
              audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              setAudioData(audioBlob);
              console.log("录音停止，音频数据已准备好。");
              stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            setAudioData(null);
            console.log("开始录制语音...");
            
            resolve();
          } catch (error) {
            stream.getTracks().forEach(track => track.stop());
            reject(error);
          }
        },
        (error) => {
          console.error('旧版getUserMedia失败:', error);
          reject(error);
        }
      );
    });
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button style={closeButtonStyle} onClick={onClose}>&times;</button> {/* 关闭按钮 */}
        <h3 style={titleStyle}>语音录制</h3>

        <div style={recordingStatusStyle}>
          {isRecording ? '正在录制...' : '准备录制'}
        </div>

        <div style={timerStyle}>
          {formatTime(recordingTime)} {/* 显示录制时长 */}
        </div>

        <div style={waveformContainerStyle}>
          {/* 语音波动效果占位符：实际应用中，这里会根据麦克风的实时音量数据来渲染波动 */}
          {isRecording ? (
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              {/* 模拟波动条，实际应根据音频数据动态生成 */}
              {Array.from({ length: 20 }).map((_, i) => ( // 20个波动条
                <div
                  key={i}
                  style={{
                    ...waveformBarStyle,
                    // 这里的 height 应该根据实际的麦克风音量数据来设置
                    // 目前仍使用随机高度模拟，但注释说明了实际用途
                    height: `${Math.random() * (waveformValue - 20) + 20}px`,
                  }}
                ></div>
              ))}
            </div>
          ) : (
            <span style={{ color: '#9e9e9e', fontSize: '14px' }}>点击“开始录制”</span>
          )}
        </div>

        <div style={buttonContainerStyle}>
          {!isRecording ? (
            <button style={startButtonStyle} onClick={handleStartRecording}>
              开始录制
            </button>
          ) : (
            <button style={stopButtonStyle} onClick={handleStopRecording}>
              结束录制
            </button>
          )}
          <button
            style={sendButtonStyle}
            onClick={handleSend}
            disabled={!audioData} // 没有录音数据时禁用发送按钮
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceChatModal;
