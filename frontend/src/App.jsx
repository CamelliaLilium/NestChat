import React, { useState, useEffect } from 'react';
import ChatPage from './pages/ChatPage.jsx';
import FriendsPage from './pages/FriendsPage.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import LoginCodePage from './pages/LoginCodePage.jsx';
import LoginVcodePage from './pages/LoginVcodePage.jsx';
import CompatibilityFixButton from './components/CompatibilityFixButton.jsx';
import AudioFixEmergency from './components/AudioFixEmergency.jsx';
import apiClient from '../utils/api.js';
import globalSocket from '../utils/globalSocket.js';
import onlineStatusManager from '../utils/onlineStatusManager.js';
import avatarManager from '../utils/avatarManager.js';
import Chrome138Fix from '../utils/chrome138Fix.js';

// App主组件，负责全局状态管理和页面路由
function App() {
  // Chrome 138 兼容性修复
  useEffect(() => {
    const chrome138Fix = new Chrome138Fix();
    chrome138Fix.runAllFixes().then(fixes => {
      if (fixes.length > 0) {
        console.log('🔧 Chrome 138兼容性修复完成:', fixes);
      }
    }).catch(error => {
      console.error('Chrome 138修复失败:', error);
    });
  }, []);

  // getInitialAppState 函数用于从 localStorage 读取初始应用状态
  const getInitialAppState = () => {
    const userStr = localStorage.getItem('currentUser'); // 尝试从 localStorage 获取当前用户信息字符串
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'; // 检查登录状态

    let user = { name: '我', email: '', avatar: '1.png' }; // 默认用户信息
    if (userStr) {
      try {
        user = JSON.parse(userStr); // 如果存在，尝试解析用户信息
      } catch (e) {
        console.error("Failed to parse currentUser from localStorage", e); // 解析失败则报错
        // 即使解析失败，也使用默认用户，避免应用崩溃
      }
    }

    // 根据登录状态决定初始页面：如果已登录则跳转到聊天页，否则跳转到登录页
    return {
      currentUser: user,
      currentPage: isLoggedIn ? 'chat' : 'login',
      isLoggedIn: isLoggedIn,
    };
  };

  // 获取初始应用状态
  const initialAppState = getInitialAppState();

  // 使用 useState Hook 管理当前用户信息
  const [currentUser, setCurrentUser] = useState(initialAppState.currentUser);
  // 使用 useState Hook 管理当前显示的页面
  const [currentPage, setCurrentPage] = useState(initialAppState.currentPage);
  // 使用 useState Hook 管理用户登录状态
  const [isLoggedIn, setIsLoggedIn] = useState(initialAppState.isLoggedIn);
  // 使用 useState Hook 管理当前选中的聊天联系人
  const [selectedContact, setSelectedContact] = useState(null); // 默认为null，没有选中联系人

  // 初始化API客户端和头像管理系统
  React.useEffect(() => {
    if (isLoggedIn && currentUser?.email) {
      apiClient.setUserEmail(currentUser.email);
      
      // 初始化头像管理系统
      const initializeAvatars = async () => {
        try {
          // 获取所有用户来初始化头像分配
          const allUsers = await apiClient.getAllUsers();
          await avatarManager.initialize(allUsers);
        } catch (error) {
          console.error('头像系统初始化失败:', error);
          // 即使失败也要初始化基本系统
          await avatarManager.initialize([currentUser]);
        }
      };
      
      // 初始化在线状态管理器
      const initializeOnlineStatus = () => {
        if (globalSocket.socket && globalSocket.isConnected) {
          onlineStatusManager.initialize(currentUser, globalSocket.socket);
          // 将在线状态管理器暴露到全局，供Socket监听器使用
          window.onlineStatusManager = onlineStatusManager;
        } else {
          // 如果Socket还未连接，稍后再试
          setTimeout(initializeOnlineStatus, 1000);
        }
      };
      
      initializeAvatars();
      initializeOnlineStatus();
    }
  }, [isLoggedIn, currentUser?.email]);

  // handleLoginSuccess 函数：处理用户成功登录后的逻辑
  const handleLoginSuccess = (user) => {
    setCurrentUser(user); // 更新当前用户信息
    setIsLoggedIn(true); // 设置登录状态为 true
    localStorage.setItem('currentUser', JSON.stringify(user)); // 将用户信息存储到 localStorage
    localStorage.setItem('isLoggedIn', 'true'); // 将登录状态存储到 localStorage
    
    // 设置API客户端的用户邮箱
    if (user.email) {
      apiClient.setUserEmail(user.email);
      // 初始化全局Socket连接
      globalSocket.initialize(user);
    }
    
    setCurrentPage('chat'); // 登录成功后跳转到聊天页面
  };

  // handleSignUpSuccess 函数：处理用户成功注册后的逻辑
  const handleSignUpSuccess = () => {
    setCurrentPage('login'); // 注册成功后跳转回登录页面
    // 可以在此处添加提示信息，告知用户注册成功，请登录
  };

  // handleAvatarChange 函数：处理用户头像变更的逻辑
  const handleAvatarChange = (newAvatar) => {
    const updatedUser = { ...currentUser, avatar: newAvatar }; // 创建更新后的用户对象
    setCurrentUser(updatedUser); // 更新当前用户信息状态
    localStorage.setItem('currentUser', JSON.stringify(updatedUser)); // 更新 localStorage 中的用户信息
    // 刷新页面以同步所有头像显示，这是根据用户需求进行的，
    // 在React中更推荐通过状态管理和组件重渲染来同步
    // window.location.reload();
  };

  // navigateToChat 函数：导航到聊天页面
  const navigateToChat = () => {
    if (isLoggedIn) { // 只有在登录状态下才能访问聊天页面
      setCurrentPage('chat');
    } else {
      setCurrentPage('login'); // 未登录则重定向到登录页面
    }
  };

  // navigateToFriends 函数：导航到好友列表页面
  const navigateToFriends = () => {
    if (isLoggedIn) { // 只有在登录状态下才能访问好友列表页面
      setCurrentPage('friends');
    } else {
      setCurrentPage('login'); // 未登录则重定向到登录页面
    }
  };

  // navigateToLogin 函数：导航到密码登录页面
  const navigateToLogin = () => {
    setCurrentPage('login');
  };

  // navigateToSignUp 函数：导航到注册页面
  const navigateToSignUp = () => {
    setCurrentPage('signup');
  };

  // navigateToLoginVcode 函数：导航到验证码登录页面
  const navigateToLoginVcode = () => {
    setCurrentPage('loginVcode');
  };

  // handleSelectFriend 函数：处理选择好友的逻辑
  const handleSelectFriend = (friend) => {
    setSelectedContact({
      name: friend.name,
      email: friend.email || friend.account, // 确保包含邮箱信息
      isOnline: friend.isOnline,
      avatar: friend.avatar,
    });
    setCurrentPage('chat'); // 选中好友后跳转到聊天页面
  };

  // 统一的退出登录逻辑，支持提示（优化：将提示交由登录页管理）
  const [logoutMessage, setLogoutMessage] = useState('');
  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } catch (e) {
      console.error('logout error:', e);
    }
    
    // 清理在线状态管理器
    if (window.onlineStatusManager) {
      onlineStatusManager.destroy();
      window.onlineStatusManager = null;
    }
    
    // 断开Socket连接
    globalSocket.disconnect();
    
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.setItem('isLoggedIn', 'false');
    setCurrentPage('login');
    setLogoutMessage('已退出登录');
  };

  // 提供给登录页的清除退出提示回调
  const handleClearLogoutMessage = () => setLogoutMessage('');

  return (
    <div>
      {/* 退出登录弹窗交由登录页管理，这里不再渲染 */}
      {!isLoggedIn ? (
        // 如果用户未登录，则渲染登录/注册相关的页面
        <>
          {currentPage === 'login' && (
            <LoginCodePage
              onLoginSuccess={handleLoginSuccess}
              onNavigateToSignUp={navigateToSignUp}
              onNavigateToVerificationLogin={navigateToLoginVcode}
              logoutMessage={logoutMessage}
              onClearLogoutMessage={handleClearLogoutMessage}
            />
          )}
          {currentPage === 'signup' && (
            <SignUpPage
              onSignUpSuccess={handleSignUpSuccess}
              onNavigateToLogin={navigateToLogin}
            />
          )}
          {currentPage === 'loginVcode' && (
            <LoginVcodePage
              onLoginSuccess={handleLoginSuccess}
              onNavigateToLogin={navigateToLogin}
              logoutMessage={logoutMessage}
              onClearLogoutMessage={handleClearLogoutMessage}
            />
          )}
        </>
      ) : (
        // 如果用户已登录，则渲染聊天/好友列表页面
        <>
          {currentPage === 'chat' && (
            <ChatPage
              onNavigateToFriends={navigateToFriends}
              selectedContact={selectedContact}
              currentUser={currentUser}
              onLogout={handleLogout}
            />
          )}
          {currentPage === 'friends' && (
            <FriendsPage
              onNavigateToChat={navigateToChat}
              onSelectFriend={handleSelectFriend}
              currentUser={currentUser}
              onAvatarChange={handleAvatarChange}
              onLogout={handleLogout}
            />
          )}
        </>
      )}
      
      {/* 应急修复组件 - 检测到严重问题时显示 */}
      <AudioFixEmergency />
      
      {/* 兼容性修复按钮 - 仅在开发环境显示 */}
      {import.meta.env.DEV && <CompatibilityFixButton />}
    </div>
  );
}

export default App; // 导出 App 组件
