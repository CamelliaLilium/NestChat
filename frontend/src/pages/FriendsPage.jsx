import React, { useState, useEffect } from 'react';
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
  const [activeChat, setActiveChat] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [showChangeSign, setShowChangeSign] = useState(false);
  const [currentSignature, setCurrentSignature] = useState(currentUser?.signature || "这是我的个性签名");

  const createSelfUser = (avatarOverride) => {
    return {
      id: currentUser?.id || 'self',
      name: currentUser?.name || "我",
      account: currentUser?.email || "current_user",
      avatar: avatarOverride || currentUser?.avatar || "/default_avatar.png", // Use avatarOverride if provided
      signature: currentSignature,
      isOnline: true,
      isSelf: true,
      isFriend: true
    };
  };

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
          if (prevSelected && (prevSelected.id === (currentUser?.id || 'self') || prevSelected.isSelf)) {
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
    // Depend on currentUser and currentSignature so that if currentUser (including avatar)
    // or signature changes from parent, this effect re-runs.
  }, [currentUser, currentSignature]);

  // Handle avatar changes
  const handleInternalAvatarChange = async (newAvatarUrl) => {
    try {
      // Assuming onAvatarChange prop handles the actual API update and updates currentUser in parent
      await onAvatarChange(newAvatarUrl);

      // Create a new selfUser object with the updated avatar
      const updatedSelfUser = createSelfUser(newAvatarUrl);

      // Update the friendsList to reflect the new avatar for the current user
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
        console.log('该用户不存在');
      } else if (results.length > 0) {
        // If there are search results, select the first one.
        // This is important because selectedFriend is displayed in FriendDetail.
        setSelectedFriend(results[0]);
      }
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
      // When search query is cleared, reset selectedFriend to current user if it was a search result.
      // Or, ideally, revert to the previously selected friend before search, or default to self.
      setSelectedFriend(friendsList.find(f => f.isSelf)); // Default to selecting self when search is cleared
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

  const handleSendMessage = (friend) => {
    if (!friend) return;
    setActiveChat(friend);
    onSelectFriend(friend);
    onNavigateToChat();
  };

  const handleVideoCall = () => {
    console.log('发起视频通话');
  };

  const handleAddFriend = async (friend) => {
    if (!friend) return;
    // Check if a request has already been sent to this friend
    if (friendRequests.includes(friend.id)) {
      console.log('好友请求已发送，请等待对方确认');
      return;
    }
    // Check if the user is already a friend
    if (friendsList.some(f => f.id === friend.id && !f.isSelf)) {
      console.log(`${friend.name} 已经是您的好友了`);
      return;
    }

    try {
      await api.addFriend(friend.id);
      setFriendRequests(prev => [...prev, friend.id]); // Track sent requests
      console.log(`已向 ${friend.name} 发送好友申请`);
    } catch (e) {
      console.error('发送好友申请失败:', e.message || e);
    }
  };

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
          searchQuery={searchQuery}
          onSearchChange={handleSearch}
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