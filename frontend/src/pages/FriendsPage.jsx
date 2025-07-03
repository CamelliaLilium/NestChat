// 随机头像选择函数（1-10.jpg）
export function getRandomAvatar() {
  const idx = Math.floor(Math.random() * 10) + 1;
  return `${idx}.png`;
}
import React, { useState, useEffect, useCallback } from 'react'; // <-- 确保这里有 useCallback
import api from '../../utils/api.js'; // 确保api路径正确
import NavButton from '../components/NavButton.jsx';
import FriendsList from '../components/FriendsList.jsx';
import FriendDetail from '../components/FriendDetail.jsx';
import FriendRequestNotification from '../components/FriendRequestNotification.jsx';
import ChangeSign from '../components/ChangeSign.jsx';

const FriendsPage = ({ onNavigateToChat, onSelectFriend, currentUser, onAvatarChange, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  // 搜索头像映射缓存
  const [searchAvatarMap, setSearchAvatarMap] = useState({});
  const [activeChat, setActiveChat] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [showChangeSign, setShowChangeSign] = useState(false);
  const [currentSignature, setCurrentSignature] = useState(currentUser?.signature || "这是我的个性签名");

  // 获取本地头像（优先 localStorage，其次 currentUser，其次默认）
  // 这里的 currentUser 总是组件当前接收到的 prop
  const getLocalAvatar = useCallback((avatarOverride, user) => {
    if (avatarOverride) return avatarOverride;
    const localAvatar = localStorage.getItem('userAvatar');
    if (localAvatar) return localAvatar;
    if (user?.avatar && user.avatar !== '') return user.avatar;
    return '1.png'; // 只返回文件名
  }, []); // getLocalAvatar 自身不依赖外部变化，因此依赖数组为空

  const createSelfUser = useCallback((avatarOverride) => { // <-- 重新使用 useCallback
    return {
      id: currentUser?.id || 'self',
      name: currentUser?.name || "我",
      account: currentUser?.email || "current_user",
      avatar: getLocalAvatar(avatarOverride, currentUser), // 使用 useCallback 后的 getLocalAvatar
      signature: currentSignature,
      isOnline: true,
      isSelf: true,
      isFriend: true
    };
  }, [currentUser, currentSignature, getLocalAvatar]); // 依赖 currentUser, currentSignature, getLocalAvatar

  // --- 数据初始化和API调用 ---
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const apiFriends = await api.getFriends();
        const selfUser = createSelfUser(); // Initial self user
        const combinedFriends = [selfUser, ...apiFriends.filter(f => f.id !== selfUser.id)];
        setFriendsList(combinedFriends);

        const allPlatformUsers = await api.getAllUsers();
        setAllUsers(allPlatformUsers.filter(user => user.id !== selfUser.id));

        const requests = await api.getFriendRequests();
        setReceivedRequests(requests);

        // --- 更新 setSelectedFriend 逻辑 ---
        setSelectedFriend(prevSelected => {
          // Find the current user in the newly calculated combinedFriends list
          const updatedSelfUser = combinedFriends.find(f => f.id === (currentUser?.id || 'self'));
          // If previously selected was "self", update to the new "self" object
          // 或者如果之前没有选中任何好友，则默认选中自己
          if (!prevSelected || (prevSelected.id === (currentUser?.id || 'self') || prevSelected.isSelf)) {
            return updatedSelfUser;
          }
          // Otherwise, maintain the previous selected state
          return prevSelected;
        });
        // --- 结束更新 setSelectedFriend 逻辑 ---

      } catch (error) {
        console.error("初始化数据失败:", error);
        setFriendsList([createSelfUser()]);
        setAllUsers([]);
        setReceivedRequests([]);
      }
    };

    fetchInitialData();
    // 确保当 currentUser 或 currentSignature 变化时，重新获取数据并更新自身信息
  }, [currentUser, currentSignature, createSelfUser]); // 添加 createSelfUser 到依赖

  // Handle avatar changes
  const handleInternalAvatarChange = async (newAvatarUrl) => {
    try {
      // 1. 调用父组件的 onAvatarChange，它应该负责更新后端和父组件的 currentUser
      await onAvatarChange(newAvatarUrl);

      // 2. 将新头像保存到 localStorage，这是 getLocalAvatar 的首选来源
      localStorage.setItem('userAvatar', newAvatarUrl);

      // 3. 立即更新 friendsList 中自身头像，无需等待父组件 currentUser 更新
      setFriendsList(prevFriends => prevFriends.map(friend =>
        friend.id === (currentUser?.id || 'self')
          ? { ...friend, avatar: newAvatarUrl }
          : friend
      ));

      // If the currently selected friend is the current user, update their avatar in selectedFriend state
      if (selectedFriend && (selectedFriend.id === (currentUser?.id || 'self') || selectedFriend.isSelf)) {
        setSelectedFriend(prevSelected => ({ ...prevSelected, avatar: newAvatarUrl }));
      }
      console.log("头像已更新:", newAvatarUrl);
    } catch (error) {
      console.error("更新头像失败:", error);
    }
  };

  const contactInfo = {
    name: currentUser?.name || "当前用户",
    isOnline: true,
  };

  // 搜索数据库所有用户，区分好友和非好友
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const response = await api.searchUsers(query);
        // 真实头像池，1-7为png，8-10为jpg
        const avatarPool = [
          '1.png', '2.png', '3.png', '4.png', '5.png', '6.png', '7.png',
          '8.jpg', '9.jpg', '10.jpg'
        ];
        // 头像分配缓存
        const newAvatarMap = { ...searchAvatarMap };
        const results = (response.users || []).map(user => {
          if (!newAvatarMap[user.id]) {
            newAvatarMap[user.id] = avatarPool[Math.floor(Math.random() * avatarPool.length)];
          }
          return {
            ...user,
            avatar: newAvatarMap[user.id],
            email: user.email || user.account || '',
            isFriend: friendsList.some(f => f.id === user.id && !f.isSelf),
            isSelf: user.id === (currentUser?.id || 'self'),
          };
        });
        setSearchAvatarMap(newAvatarMap);
        setSearchResults(results);
        setShowSearchResults(true);
        if (results.length === 0) {
          console.log('该用户不存在');
        } else if (results.length > 0) {
          setSelectedFriend(results[0]);
        }
      } catch (error) {
        console.error('搜索用户失败:', error);
        setSearchResults([]);
        setShowSearchResults(true);
      }
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
      setSelectedFriend(friendsList.find(f => f.isSelf));
    }
  };

  const handleFriendSelect = (friend) => {
    setSelectedFriend(friend);
    setShowSearchResults(false);
  };

  const handleRefreshPage = async () => {
    try {
      const apiFriends = await api.getFriends();
      const selfUser = createSelfUser();
      const combinedFriends = [selfUser, ...apiFriends.filter(f => f.id !== selfUser.id)];
      setFriendsList(combinedFriends);

      const allPlatformUsers = await api.getAllUsers();
      setAllUsers(allPlatformUsers.filter(user => user.id !== selfUser.id));

      const requests = await api.getFriendRequests();
      setReceivedRequests(requests);

      // Refreshing also needs to update setSelectedFriend
      setSelectedFriend(prevSelected => {
        const updatedSelfUser = combinedFriends.find(f => f.id === (currentUser?.id || 'self'));
        if (prevSelected && (prevSelected.id === (currentUser?.id || 'self') || prevSelected.isSelf)) {
          return updatedSelfUser;
        }
        return prevSelected;
      });

      console.log("数据已刷新");
    } catch (error) {
      console.error("刷新数据失败:", error);
    }
  };
// 处理发送消息
  const handleSendMessage = (friend) => {
    if (!friend) return;
    setActiveChat(friend);
    onSelectFriend(friend);
    onNavigateToChat();
  };

  const handleVideoCall = () => {
    console.log('发起视频通话');
  };
// 处理添加好友
  const handleAddFriend = async (friend) => {
    if (!friend) return;
    if (friendRequests.includes(friend.email)) {
      console.log('好友请求已发送，请等待对方确认');
      return;
    }
    if (friendsList.some(f => f.id === friend.id && !f.isSelf)) {
      console.log(`${friend.name} 已经是您的好友了`);
      return;
    }
    try {
      await api.addFriend(friend.email);
      setFriendRequests(prev => [...prev, friend.email]);
      // 新增：将头像同步到好友列表
      setFriendsList(prev => [
        ...prev,
        {
          ...friend,
          avatar: searchAvatarMap[friend.id] || friend.avatar || '1.png',
          isFriend: true,
          isSelf: false,
        }
      ]);
      console.log(`已向 ${friend.name || friend.username} 发送好友申请`);
    } catch (e) {
      console.error('发送好友申请失败:', e.message || e);
    }
  };
// 处理接受和拒绝好友请求
  const handleAcceptRequest = async (request) => {
    try {
      if (request.id) {
        await api.acceptFriendRequest(request.id);
      }
      setFriendsList(prev => [
        ...prev,
        { ...request.from, isFriend: true } // Add the new friend to the list
      ]);
      setReceivedRequests(prev => prev.filter(r => r.id !== request.id)); // Remove from pending requests
      console.log(`已添加 ${request.from.name} 为好友`); // Use request.from.name
    } catch (e) {
      console.error('接受好友请求失败:', e.message || e);
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      if (request.id) {
        await api.rejectFriendRequest(request.id);
      }
      setReceivedRequests(prev => prev.filter(r => r.id !== request.id));
      console.log('已拒绝好友请求');
    } catch (e) {
      console.error('拒绝好友请求失败:', e.message || e);
    }
  };

  const handleChangeSignature = () => {
    setShowChangeSign(true);
  };

  const handleSaveSignature = async (newSignature) => {
    try {
      // Assuming here you might call an API to update the signature if supported by backend
      // await api.updateProfile({ signature: newSignature });
      setCurrentSignature(newSignature);
      setFriendsList(prev => prev.map(friend =>
        friend.id === (currentUser?.id || 'self')
          ? { ...friend, signature: newSignature }
          : friend
      ));
      if (selectedFriend && (selectedFriend.id === (currentUser?.id || 'self') || selectedFriend.isSelf)) {
        setSelectedFriend(prev => ({ ...prev, signature: newSignature }));
      }
      setShowChangeSign(false);
      console.log("个性签名已保存");
    } catch (error) {
      console.error("保存个性签名失败:", error);
    }
  };

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
    marginRight: '1rem',
    overflow: 'hidden',
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

  const responsiveTextStyle = {
    fontSize: 'clamp(14px, 2vw, 18px)',
    fontWeight: '500',
    color: 'rgb(2, 0, 0)',
  };

  // 删除好友后刷新本地好友列表和后端同步
  const handleFriendDeleted = async (friendId) => {
    setFriendsList(prev => {
      const updatedList = prev.filter(f => f.id !== friendId && !f.isSelf);
      // 如果当前选中的是被删好友，则切换到自己
      setSelectedFriend(currentSelected => {
        if (currentSelected && currentSelected.id === friendId) {
          // 确保从最新的列表中找到“我”
          return updatedList.find(f => f.isSelf);
        }
        return currentSelected;
      });
      return updatedList; // 返回更新后的列表
    });
    // 可选：刷新后端数据，确保同步
    await handleRefreshPage();
  };

  return (
    <div style={containerStyle}>
      {/* 顶部栏 */}
      <div style={headerStyle}>
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

        <div style={contactInfoStyle}>
          <span style={responsiveTextStyle}>
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
            👥 {/* 好友列表图标 */}
          </NavButton>
          <NavButton
            onClick={onNavigateToChat}
            title="聊天页面"
          >
            💬 {/* 聊天图标 */}
          </NavButton>
          {onLogout && (
            <NavButton
              onClick={onLogout}
              title="退出登录"
            >
              🚪 {/* 退出登录图标 */}
            </NavButton>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div style={mainContentStyle}>
        {/* 左侧面板 - 好友列表 */}
      <FriendsList
        friends={showSearchResults ? searchResults : friendsList}
        selectedFriend={selectedFriend}
        onFriendSelect={handleFriendSelect}
        onSearchChange={handleSearch} // 输入变化时就搜索
        onSearch={handleSearch}
      />

        {/* 右侧面板 - 好友详情 */}
        <FriendDetail
          selectedFriend={selectedFriend}
          onSendMessage={() => handleSendMessage(selectedFriend)}
          onVideoCall={handleVideoCall}
          onAvatarChange={handleInternalAvatarChange}
          friendRequests={friendRequests}
          onAddFriend={handleAddFriend}
          onChangeSignature={handleChangeSignature}
          onFriendDeleted={handleFriendDeleted}
        />
      </div>

      <FriendRequestNotification
        requests={receivedRequests}
        onAccept={handleAcceptRequest}
        onReject={handleRejectRequest}
      />

      <ChangeSign
        isOpen={showChangeSign}
        onClose={() => setShowChangeSign(false)}
        currentSignature={currentSignature}
        onSave={handleSaveSignature}
      />
    </div>
  );
};

export default FriendsPage;