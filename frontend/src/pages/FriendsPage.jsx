import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import NavButton from '../components/NavButton.jsx';
import FriendsList from '../components/FriendsList.jsx';
import FriendDetail from '../components/FriendDetail.jsx';
import FriendRequestNotification from '../components/FriendRequestNotification.jsx';


  const FriendsPage = ({ onNavigateToChat, onSelectFriend, currentUser, onAvatarChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [allUsers, setAllUsers] = useState([]); // 所有用户列表
  const [friendRequests, setFriendRequests] = useState([]); // 已发送的好友请求id
  const [receivedRequests, setReceivedRequests] = useState([]); // 收到的好友请求对象
  const [friendsList, setFriendsList] = useState([]);

 
  // 页面加载时获取数据
  useEffect(() => {
    // 获取当前用户信息
    api.getProfile().then(user => setCurrentUser(user)).catch(() => setCurrentUser(null));
    // 获取好友列表
    api.getFriends().then(friends => setFriendsList(friends)).catch(() => setFriendsList([]));
    // 获取所有用户（用于全平台搜索）
    api.getAllUsers().then(users => setAllUsers(users)).catch(() => setAllUsers([]));
    // 获取收到的好友请求
    api.getFriendRequests().then(requests => setReceivedRequests(requests)).catch(() => setReceivedRequests([]));
  }, []);


  // 3. 个人信息显示
  const contactInfo = {
    name: currentUser?.name || "当前用户",
    isOnline: true,
  };

 
  // 事件处理函数
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = allUsers.filter(user =>
        user.name.includes(query) ||
        user.account.includes(query) ||
        user.signature.includes(query)
      );

      setSearchResults(results);
      setShowSearchResults(true);

      if (results.length === 0) {
        alert('该用户不存在');
      } else if (results.length > 0) {
        setSelectedFriend(results[0]);
      }
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }
  };

  const handleFriendSelect = (friend) => {
    setSelectedFriend(friend);
    setShowSearchResults(false);
  };

  // 已有 onNavigateToChat 作为 prop，可以直接调用
  // const handleNavigateToChat = () => {
  //   onNavigateToChat();
  // };

  const handleRefreshPage = () => {
    window.location.reload();
  };

  const handleSendMessage = (friend) => {
    if (!friend) return;
    setActiveChat(friend);
    onSelectFriend(friend);
    onNavigateToChat(); // 调用从 props 传入的导航函数
  };

  // 添加好友
  const handleAddFriend = async (friend) => {
    if (!friend) return;
    if (friendRequests.includes(friend.id)) {
      alert('好友请求已发送，请等待对方确认');
      return;
    }
    try {
      await api.addFriend(friend.id); // 1. 调用API
      setFriendRequests([...friendRequests, friend.id]);
      alert(`已向 ${friend.name} 发送好友申请`);
      // 调试用：模拟收到好友请求（如果后端未实现，前端临时模拟）
      setReceivedRequests(prev => [...prev, {
        id: Date.now(), // 模拟请求id
        from: friend, // 假设from字段为发起人
        name: friend.name,
        account: friend.account,
        avatar: friend.avatar,
        signature: friend.signature,
      }]);
    } catch (e) {
      alert(e.message || '发送好友申请失败');
    }
  };

  // 通过好友请求
  const handleAcceptRequest = async (request) => {
    try {
      if (request.id) {
        await api.acceptFriendRequest(request.id); // 调用API
      }
      setFriendsList(prev => [
        ...prev,
        { ...request.from, isFriend: true }
      ]);
      setReceivedRequests(prev => prev.filter(r => r.id !== request.id));
      alert(`已添加 ${request.name} 为好友`);
    } catch (e) {
      alert(e.message || '操作失败');
    }
  };

  // 拒绝好友请求
  const handleRejectRequest = async (request) => {
    try {
      if (request.id) {
        await api.rejectFriendRequest(request.id); // 调用API
      }
      setReceivedRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (e) {
      alert(e.message || '操作失败');
    }
  };

  // 响应式样式定义
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#fce4ec',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    minWidth: '320px',
    boxSizing: 'border-box',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '1vw 2vw',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #f8bbd9',
    boxShadow: '0 2px 4px rgba(233, 30, 99, 0.1)',
    minHeight: '60px',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem',
  };

  const logoStyle = {
    width: 'clamp(35px, 4vw, 50px)',
    height: 'clamp(35px, 4vw, 50px)',
    backgroundColor: '#e91e63',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // 移除 color 和 fontSize，因为将使用图片
    marginRight: '1rem',
    overflow: 'hidden', // 确保图片超出边界时被裁剪
  };

  const contactInfoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flex: '1',
    minWidth: '120px',
  };

  const statusDotStyle = (isOnline) => ({
    width: 'clamp(6px, 1vw, 10px)',
    height: 'clamp(6px, 1vw, 10px)',
    borderRadius: '50%',
    backgroundColor: isOnline ? '#4caf50' : '#9e9e9e',
  });

  const navButtonsContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(10px, 1.5vw, 20px)',
    flexWrap: 'wrap',
  };

  const mainContentStyle = {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    flexDirection: window.innerWidth < 768 ? 'column' : 'row',
    gap: '1px',
  };

  // 响应式文字大小
  const responsiveTextStyle = {
    fontSize: 'clamp(14px, 2vw, 18px)', // 调整为更合理的响应式字体大小范围
    fontWeight: '500',
    color: 'rgb(2, 0, 0)',
  };

  return (
    <div style={containerStyle}>
      {/* 顶部栏 */}
      <div style={headerStyle}>
        {/* === 修改这里，用 <img> 标签替换 'F' === */}
        <div style={logoStyle}>
          <img
            src="/logo.png" 
            alt="Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '8px',
            }}
          />
        </div>
        {/* === 结束修改 === */}

        <div style={contactInfoStyle}>
          <span style={responsiveTextStyle}> {/* 使用响应式字体样式 */}
            {contactInfo.name}
          </span>
          <div style={statusDotStyle(contactInfo.isOnline)}></div>
        </div>
        <div style={navButtonsContainerStyle}>
          <NavButton
            onClick={handleRefreshPage}
            title="好友列表"
            isActive={true}
          >
            👥
          </NavButton>
          <NavButton
            onClick={onNavigateToChat}
            title="聊天页面"
          >
            💬
          </NavButton>
          <NavButton
            onClick={onLogout}
            title="退出登录"
          >
            🚪
          </NavButton>
        </div>
      </div>

      {/* 主内容区 */}
      <div style={mainContentStyle}>
        {/* 左侧面板 - 好友列表 */}
        <FriendsList
          friends={showSearchResults ? searchResults : friendsList}
          selectedFriend={selectedFriend}
          onFriendSelect={handleFriendSelect}
          searchQuery={searchQuery}
          onSearchChange={handleSearch}
        />

        {/* 右侧面板 - 好友详情 */}
        <FriendDetail
          selectedFriend={selectedFriend}
          onSendMessage={() => handleSendMessage(selectedFriend)}
          onVideoCall={handleVideoCall}
          onAvatarChange={onAvatarChange}
          friendRequests={friendRequests}
          onAddFriend={handleAddFriend}
        />
      </div>

      <FriendRequestNotification
        requests={receivedRequests}
        onAccept={handleAcceptRequest}
        onReject={handleRejectRequest}
      />
    </div>
  );
};

export default FriendsPage;