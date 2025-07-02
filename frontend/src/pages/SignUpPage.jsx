import React, { useState } from 'react';
import api from '../../utils/api';

const SignUpPage = ({ onNavigateToLogin, onRegisterSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    nickname: '',
    password: '',
    confirmPassword: '',
    verificationCode: ''
  });
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const showAlertMessage = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendCode = async () => {
    if (!formData.email.trim()) {
      showAlertMessage('请输入邮箱');
      return;
    }

    if (!validateEmail(formData.email)) {
      showAlertMessage('请输入有效的邮箱地址');
      return;
    }

    try {
      console.log('开始发送验证码:', formData.email); // 添加调试日志
      
      const response = await api.sendVerificationCode(formData.email);
      
      console.log('发送验证码响应:', response); // 添加调试日志
      
      if (response.success === true) {
        setCodeSent(true);
        showAlertMessage('验证码已发送到您的邮箱，请检查收件箱（包括垃圾邮件文件夹）');
        
        // 如果是开发环境，显示验证码
        if (response.dev_code) {
          console.log('开发环境验证码:', response.dev_code);
        }
      } else {
        const errorMessage = response.error || response.message || '发送验证码失败';
        
        if (errorMessage.includes('已被注册') || response.code === 'USER_EXISTS') {
          showAlertMessage('该邮箱已被注册，请更换邮箱或直接登录');
        } else if (errorMessage.includes('邮箱格式')) {
          showAlertMessage('邮箱格式不正确，请检查后重试');
        } else if (errorMessage.includes('Python') || errorMessage.includes('邮件发送服务')) {
          showAlertMessage('邮件服务暂时不可用，请稍后重试');
        } else {
          showAlertMessage(errorMessage);
        }
      }
    } catch (error) {
      console.error('发送验证码出错:', error);
      
      if (error.message.includes('网络连接失败')) {
        showAlertMessage('网络连接失败，请确保后端服务器已启动');
      } else if (error.message.includes('服务器返回数据格式错误')) {
        showAlertMessage('服务器响应异常，请联系管理员');
      } else {
        showAlertMessage(`发送验证码失败: ${error.message}`);
      }
    }
  };

  const handleRegister = async () => {
    // 检查所有字段是否为空
    const requiredFields = [
      { field: 'email', name: '邮箱' },
      { field: 'nickname', name: '昵称' },
      { field: 'password', name: '密码' },
      { field: 'confirmPassword', name: '确认密码' },
      { field: 'verificationCode', name: '验证码' }
    ];

    for (const { field, name } of requiredFields) {
      if (!formData[field].trim()) {
        showAlertMessage(`请输入${name}`);
        return;
      }
    }

    // 验证邮箱格式
    if (!validateEmail(formData.email)) {
      showAlertMessage('请输入有效的邮箱地址');
      return;
    }

    // 检查密码长度
    if (formData.password.length < 6) {
      showAlertMessage('密码长度至少6位');
      return;
    }

    // 检查密码确认
    if (formData.password !== formData.confirmPassword) {
      showAlertMessage('两次输入的密码不一致');
      return;
    }

    try {
      console.log('开始注册请求:', formData);
      
      const response = await api.register(
        formData.email,
        formData.nickname,
        formData.password,
        formData.verificationCode
      );
      
      console.log('注册响应:', response);
      
      if (response.success === true || response.user) {
        showAlertMessage('注册成功！即将跳转到登录页面');
        setTimeout(() => {
          onRegisterSuccess();
        }, 2000);
      } else {
        // 处理注册失败的情况
        const errorMessage = response.error || response.message || '注册失败';
        
        if (response.code === 'USER_EXISTS' || errorMessage.includes('已被注册')) {
          showAlertMessage('该邮箱已被注册，请更换邮箱或直接登录');
        } else if (response.code === 'VCODE_ERROR' || errorMessage.includes('验证码错误')) {
          showAlertMessage('验证码错误，请检查后重试');
        } else if (response.code === 'VCODE_EXPIRED' || errorMessage.includes('验证码已过期')) {
          showAlertMessage('验证码已过期，请重新获取');
          setCodeSent(false);
        } else {
          showAlertMessage(errorMessage);
        }
      }
    } catch (error) {
      console.error('注册出错:', error);
      
      if (error.message.includes('网络连接失败')) {
        showAlertMessage('网络连接失败，请确保后端服务器已启动');
      } else {
        showAlertMessage(`注册失败: ${error.message}`);
      }
    }
  };

  const handleLoginPage = () => {
    onNavigateToLogin();
  };

  // 桌面端适配样式
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#fce4ec',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '20px',
    minWidth: '1200px', // 桌面端最小宽度
    width: '100vw', // 占据整个视口宽度
    boxSizing: 'border-box', // 盒模型
  };

  const formContainerStyle = {
    backgroundColor: '#ffffff',
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

  const codeInputContainerStyle = {
    display: 'flex',
    gap: '10px', // 增加间距
    alignItems: 'flex-end',
  };

  const codeInputStyle = {
    ...inputStyle,
    flex: 1,
  };

  const sendCodeButtonStyle = {
    padding: '14px 20px', // 增加内边距
    backgroundColor: codeSent ? '#c8e6c9' : '#f8bbd9',
    color: codeSent ? '#4caf50' : '#e91e63',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px', // 调整字体
    fontWeight: '500',
    cursor: codeSent ? 'default' : 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  };

  const registerButtonStyle = {
    width: '100%',
    padding: '14px 28px', // 增加内边距
    backgroundColor: '#e91e63',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px', // 增大字体
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '35px', // 增加顶部间距
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

  const Button = ({ style, onClick, children, disabled = false }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isActive, setIsActive] = useState(false);

    if (disabled) {
      return (
        <button style={style} disabled>
          {children}
        </button>
      );
    }

    const hoverStyle = {
      backgroundColor: '#c2185b',
      transform: 'translateY(-1px)'
    };
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
        <h1 style={titleStyle}>注册</h1>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>邮箱</label>
          <input
            style={inputStyle}
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => {
              e.target.style.borderColor = '#f8bbd9';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="请输入邮箱"
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>昵称</label>
          <input
            style={inputStyle}
            type="text"
            value={formData.nickname}
            onChange={(e) => handleInputChange('nickname', e.target.value)}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => {
              e.target.style.borderColor = '#f8bbd9';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="请输入昵称"
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>密码</label>
          <input
            style={inputStyle}
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => {
              e.target.style.borderColor = '#f8bbd9';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="请输入密码（至少6位）"
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>确认密码</label>
          <input
            style={inputStyle}
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={(e) => {
              e.target.style.borderColor = '#f8bbd9';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="请再次输入密码"
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>验证码</label>
          <div style={codeInputContainerStyle}>
            <input
              style={codeInputStyle}
              type="text"
              value={formData.verificationCode}
              onChange={(e) => handleInputChange('verificationCode', e.target.value)}
              onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
              onBlur={(e) => {
                e.target.style.borderColor = '#f8bbd9';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="请输入验证码"
            />
            <button
              style={sendCodeButtonStyle}
              onClick={handleSendCode}
              disabled={codeSent}
            >
              {codeSent ? '已发送' : '发送验证码'}
            </button>
          </div>
        </div>

        <Button
          style={registerButtonStyle}
          onClick={handleRegister}
        >
          注册
        </Button>

        <div style={linkStyle}>
          <a
            style={linkTextStyle}
            onClick={handleLoginPage}
            onMouseEnter={(e) => e.target.style.color = '#c2185b'}
            onMouseLeave={(e) => e.target.style.color = '#e91e63'}
          >
            已有账号？去登录
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

export default SignUpPage;
