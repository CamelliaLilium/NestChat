import React, { useState } from 'react';
import api from '../../utils/api'; 

const LoginVcodePage = ({ onNavigateToLogin, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [codeSent, setCodeSent] = useState(false);


  const handleSendCode = async () => {
    if (!email.trim()) {
      showAlertMessage('请输入邮箱');
      return;
    }

    try {
      const response = await api.sendVerificationCode(email);

      if (response.success) {
        setCodeSent(true);
        showAlertMessage('验证码已发送到您的邮箱');
      } else if (response.error === 'USER_NOT_FOUND') {
        showAlertMessage('该用户不存在，请注册');
      } else {
        showAlertMessage(response.error || '发送验证码失败');
      }
    } catch (error) {
      console.error('发送验证码出错:', error);
      showAlertMessage('发送验证码失败');
    }
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      showAlertMessage('请输入邮箱');
      return;
    }
    if (!verificationCode.trim()) {
      showAlertMessage('请输入验证码');
      return;
    }

  try {
    const response = await api.loginWithCode(email, verificationCode);

    if (response.success === true || (response.token && response.user)) {
      api.setToken(response.token);
      api.setUserEmail(response.user.email); // 保存用户邮箱
      showAlertMessage('登录成功！');
      setTimeout(() => {
        onLoginSuccess({
          email: response.user.email,
          name: response.user.name || response.user.username, // 兼容两种字段名
          token: response.token
        });
      }, 1000);
    } else {
      const errorMessage = response.error || response.message || '登录失败';
      
      if (errorMessage.includes('用户不存在') || response.code === 'USER_NOT_FOUND') {
        showAlertMessage('该用户不存在，请先注册');
      } else if (errorMessage.includes('验证码错误') || response.code === 'VCODE_ERROR') {
        showAlertMessage('验证码错误，请检查后重试');
      } else if (errorMessage.includes('验证码已过期') || response.code === 'VCODE_EXPIRED') {
        showAlertMessage('验证码已过期，请重新获取');
        setCodeSent(false);
      } else {
        showAlertMessage(errorMessage);
      }
    }
  } catch (error) {
    console.error('登录出错:', error);
    
    if (error.message.includes('网络连接失败')) {
      showAlertMessage('网络连接失败，请确保后端服务器已启动');
    } else if (error.message.includes('服务器返回数据格式错误')) {
      showAlertMessage('服务器响应异常，请联系管理员');
    } else {
      showAlertMessage(`登录失败: ${error.message}`);
    }
  }
};

  const handlePasswordLogin = () => {
    onNavigateToLogin();
  };

  // 桌面端适配样式
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    // === 修改这里，添加背景图片 ===
    backgroundImage: 'url("/LoginBack.png")', // 假设图片在 public/images 目录下
    backgroundSize: 'cover', // 覆盖整个容器
    backgroundRepeat: 'no-repeat', // 不重复平铺
    backgroundPosition: 'center', // 居中显示
    // === 结束修改 ===
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '20px',
    minWidth: '1200px', // 桌面端最小宽度
    width: '100vw', // 占据整个视口宽度
    boxSizing: 'border-box', // 盒模型
  };

  const formContainerStyle = {
    backgroundColor: 'rgba(252, 252, 252, 0.8)',
    borderRadius: '16px',
    padding: '50px 60px', // 增加内边距
    boxShadow: '0 8px 32px rgba(233, 30, 99, 0.15)',
    width: '100%',
    maxWidth: '480px', // 增加最大宽度
    minWidth: '400px', // 设置最小宽度
  };

  const titleStyle = {
    fontSize: '28px', // 增大标题字体
    fontWeight: '600',
    color: '#e91e63',
    textAlign: 'center',
    marginBottom: '40px', // 增加底部间距
  };

  const inputGroupStyle = {
    marginBottom: '24px', // 增加间距
  };

  const labelStyle = {
    display: 'block',
    fontSize: '16px', // 增大字体
    fontWeight: '500',
    color: '#424242',
    marginBottom: '10px', // 增加间距
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 18px', // 增加内边距
    border: '1px solid #f8bbd9',
    borderRadius: '10px', // 调整圆角
    fontSize: '16px', // 增大字体
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxSizing: 'border-box',
  };

  const inputFocusStyle = {
    borderColor: '#e91e63',
    boxShadow: '0 0 0 3px rgba(233, 30, 99, 0.1)', // 增加阴影
  };

  const buttonContainerStyle = {
    display: 'flex',
    gap: '15px', // 增加间距
    marginTop: '35px', // 增加顶部间距
  };

  const buttonStyle = {
    flex: 1,
    padding: '14px 28px', // 增加内边距
    borderRadius: '10px',
    border: 'none',
    fontSize: '16px', // 增大字体
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  const sendCodeButtonStyle = {
    ...buttonStyle,
    backgroundColor: codeSent ? '#c8e6c9' : '#f8bbd9',
    color: codeSent ? '#4caf50' : '#e91e63',
    cursor: codeSent ? 'default' : 'pointer',
  };

  const loginButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#e91e63',
    color: '#ffffff',
  };

  const linkStyle = {
    textAlign: 'center',
    marginTop: '20px',
  };

  const linkTextStyle = {
    color: '#e91e63',
    fontSize: '14px',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
  };

  const alertStyle = {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#ffffff',
    color: '#e91e63',
    padding: '12px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(233, 30, 99, 0.2)',
    border: '1px solid #f8bbd9',
    zIndex: 1000,
    animation: showAlert ? 'slideDown 0.3s ease' : 'slideUp 0.3s ease',
  };

  const Button = ({ style, onClick, children, type = 'button', disabled = false }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isActive, setIsActive] = useState(false);

    if (disabled) {
      return (
        <button style={style} disabled>
          {children}
        </button>
      );
    }

    const hoverStyle = type === 'sendCode'
      ? { backgroundColor: '#f48fb1', transform: 'translateY(-1px)' }
      : { backgroundColor: '#c2185b', transform: 'translateY(-1px)' };

    const activeStyle = { transform: 'translateY(0px) scale(0.98)' };

    return (
      <button
        style={{
          ...style,
          ...(isHovered ? hoverStyle : {}),
          ...(isActive ? activeStyle : {}),
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={() => setIsActive(true)}
        onMouseUp={() => setIsActive(false)}
        onClick={onClick}
      >
        {children}
      </button>
    );
  };

  return (
    <div style={containerStyle}>
      <div style={formContainerStyle}>
        <h1 style={titleStyle}>验证码登录</h1>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>邮箱</label>
          <input
            style={inputStyle}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => {
              e.target.style.borderColor = '#f8bbd9';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="请输入邮箱"
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>验证码</label>
          <input
            style={inputStyle}
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => {
              e.target.style.borderColor = '#f8bbd9';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="请输入验证码"
          />
        </div>

        <div style={buttonContainerStyle}>
          <Button
            style={sendCodeButtonStyle}
            onClick={handleSendCode}
            type="sendCode"
            disabled={codeSent}
          >
            {codeSent ? '已发送' : '发送验证码'}
          </Button>
          <Button
            style={loginButtonStyle}
            onClick={handleLogin}
            type="login"
          >
            登录
          </Button>
        </div>

        <div style={linkStyle}>
          <a
            style={linkTextStyle}
            onClick={handlePasswordLogin}
            onMouseEnter={(e) => e.target.style.color = '#c2185b'}
            onMouseLeave={(e) => e.target.style.color = '#e91e63'}
          >
            密码登录
          </a>
        </div>
      </div>

      {/* alert 弹窗 */}
      {showAlert && (
        <div style={alertStyle}>
          {alertMessage}
        </div>
      )}

      <style>
        {`
          @keyframes slideDown {
            from {
              transform: translateX(-50%) translateY(-100%);
              opacity: 0;
            }
            to {
              transform: translateX(-50%) translateY(0);
              opacity: 1;
            }
          }

          @keyframes slideUp {
            from {
              transform: translateX(-50%) translateY(0);
              opacity: 1;
            }
            to {
              transform: translateX(-50%) translateY(-100%);
              opacity: 0;
            }
          }
        `}
      </style>
    </div>
  );
};

export default LoginVcodePage;
