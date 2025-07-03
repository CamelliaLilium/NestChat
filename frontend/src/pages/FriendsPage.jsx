import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api.js';
import socketClient from '../utils/socket.js';
import { getAvatarForUser } from '../utils/avatarUtils.js';
import NavButton from '../components/NavButton.jsx';
import FriendsList from '../components/FriendsList.jsx';
import FriendDetail from '../components/FriendDetail.jsx';
import FriendRequestNotification from '../components/FriendRequestNotification.jsx';
import ChangeSign from '../components/ChangeSign.jsx';

// 随机头像选择函数（1-10.jpg）
export function getRandomAvatar() {
  const idx = Math.floor(Math.random() * 10) + 1;
  return `${idx}.png`;
}

// 个性签名数组
const SIGNATURE_POOL = [
  "兄弟你好香",
  "别报错了我真求你了",
  "一定要接上啊",
  "披萨好吃好吃好吃好吃好吃",
  "我将成为！Prompt的王者！",
  "github我恨你",
  "吃什么啊，今天晚上",
  "我服了，我真服了",
  "我真要睡着了",
  "aaa收代码，收项目小窗戳戳",
  "There's no time to lose~",
  "别着急，一定能弄完的",
  "我刚起床，还在床上呢",
  "aaa，你的邮箱验证码是什么",
  "就是想尝尝芝士火鸡面烤冷面",
  "就这样，我的一生就完蛋了",
  "赵延秋女士生日快乐！万寿无疆！"
];

// 根据用户邮箱生成固定的个性签名
export function getSignatureForUser(email) {
  if (!email) return "请输入你的个性签名...";
  
  // 使用邮箱的哈希值来确保每个用户的签名是固定的
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  // 确保索引为正数
  const index = Math.abs(hash) % SIGNATURE_POOL.length;
  return SIGNATURE_POOL[index];
}

const FriendsPage = ({ onNavigateToChat, onSelectFriend, currentUser, onAvatarChange, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentFriendRequests, setSentFriendRequests] = useState([]); // 已发送的好友请求
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
        
        // 确保从API获取的好友都设置了正确的属性
        const friendsWithAttributes = apiFriends.map(friend => ({
          ...friend,
          isFriend: true,
          isSelf: false,
          isOnline: friend.status === 'online', // 严格按照后端返回的status判断
          email: friend.email, // 确保email字段存在
          account: friend.email, // 账号就是邮箱
          signature: getSignatureForUser(friend.email), // 生成固定的个性签名
          name: friend.name || friend.username, // 确保name字段存在
          avatar: getAvatarForUser(friend.email) // 生成固定的头像
        }));
        
        const combinedFriends = [selfUser, ...friendsWithAttributes.filter(f => f.id !== selfUser.id)];
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

    // 初始化Socket.IO连接和事件监听
    const socketUrl = import.meta.env.VITE_WS_URL?.replace('ws://', 'http://').replace('wss://', 'https://') || 
                     import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') ||
                     `${window.location.protocol}//${window.location.hostname}:3001`;
    socketClient.connect(socketUrl); // 使用动态地址
    
    // 当连接成功后，加入用户房间
    socketClient.on('connect', () => {
      console.log('FriendsPage: Socket连接成功');
      if (currentUser?.email) {
        const success = socketClient.emit('join_user_room', currentUser.email);
        if (success) {
          console.log('已加入用户房间:', currentUser.email);
        } else {
          console.log('加入用户房间失败，Socket未连接');
        }
      }
    });
    
    // 监听好友请求事件
    socketClient.on('friend_request', (data) => {
      console.log('收到好友请求:', data);
      if (data.to.email === currentUser?.email) {
        setReceivedRequests(prev => [...prev, {
          id: data.from.email,
          from: data.from,
          requestTime: data.requestTime,
          status: 'pending'
        }]);
      }
    });

    // 监听好友请求被接受事件
    socketClient.on('friend_request_accepted', (data) => {
      console.log('好友请求被接受:', data);
      const currentUserEmail = currentUser?.email;
      
      if (data.inviter.email === currentUserEmail || data.invitee.email === currentUserEmail) {
        // 刷新好友列表
        fetchInitialData();
        
        if (data.inviter.email === currentUserEmail) {
          // 我是发起者，清除已发送请求状态，显示成功消息
          setSentFriendRequests(prev => prev.filter(email => email !== data.invitee.email));
          alert(`${data.invitee.username} 接受了你的好友请求！`);
          
          // 如果当前选中的是这个新好友，立即更新其状态
          setSelectedFriend(prev => {
            if (prev && (prev.id === data.invitee.email || prev.email === data.invitee.email)) {
              return { ...prev, isFriend: true };
            }
            return prev;
          });
        }
      }
    });

    // 监听好友请求被拒绝事件
    socketClient.on('friend_request_rejected', (data) => {
      console.log('好友请求被拒绝:', data);
      const currentUserEmail = currentUser?.email;
      
      if (data.inviter.email === currentUserEmail) {
        // 我是发起者，清除已发送请求状态，显示拒绝消息
        setSentFriendRequests(prev => prev.filter(email => email !== data.invitee.email));
        alert(`${data.invitee.username} 拒绝了你的好友请求`);
      }
    });

    // 监听好友被删除事件
    socketClient.on('friend_deleted', (data) => {
      console.log('好友关系被删除:', data);
      const currentUserEmail = currentUser?.email;
      
      if (data.user1?.email === currentUserEmail || data.user2?.email === currentUserEmail) {
        // 刷新好友列表
        fetchInitialData();
        
        // 获取被删除的好友信息
        const deletedFriend = data.user1?.email === currentUserEmail ? data.user2 : data.user1;
        if (deletedFriend) {
          console.log(`${deletedFriend.username} 已从好友列表中移除`);
        }
      }
    });

    // 监听用户在线状态变化
    socketClient.on('friend_status_change', (data) => {
      console.log('好友状态变化:', data);
      const { userId, status } = data;
      
      // 更新好友列表中的在线状态
      setFriendsList(prevFriends => prevFriends.map(friend =>
        (friend.id === userId || friend.email === userId) 
          ? { ...friend, isOnline: status === 'online' } 
          : friend
      ));
      
      // 如果当前选中的好友状态发生变化，也要更新
      setSelectedFriend(prev => {
        if (prev && (prev.id === userId || prev.email === userId)) {
          return { ...prev, isOnline: status === 'online' };
        }
        return prev;
      });
    });

    fetchInitialData();
    
    // 清理函数
    return () => {
      socketClient.off('connect');
      socketClient.off('friend_request');
      socketClient.off('friend_request_accepted');
      socketClient.off('friend_request_rejected');
      socketClient.off('friend_deleted');
      socketClient.off('friend_status_change');
    };
    
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
        const results = (response.users || []).map(user => {
          // 检查是否为好友关系 - 确保正确判断
          const isFriend = friendsList.some(f => 
            (f.id === user.id || f.email === user.email) && !f.isSelf && f.isFriend !== false
          );
          const isSelf = user.id === (currentUser?.id || 'self') || user.email === currentUser?.email;
          
          return {
            ...user,
            avatar: getAvatarForUser(user.email || user.account), // 使用固定的头像分配
            email: user.email || user.account || '',
            account: user.email || user.account || '', // 账号就是邮箱
            signature: getSignatureForUser(user.email || user.account), // 生成固定的个性签名
            name: user.name || user.username, // 确保name字段存在
            isFriend: isFriend,
            isSelf: isSelf,
          };
        });
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
      
      // 确保从API获取的好友都设置了正确的属性
      const friendsWithAttributes = apiFriends.map(friend => ({
        ...friend,
        isFriend: true,
        isSelf: false,
        isOnline: friend.status === 'online', // 严格按照后端返回的status判断
        email: friend.email, // 确保email字段存在
        account: friend.email, // 账号就是邮箱
        signature: getSignatureForUser(friend.email), // 生成固定的个性签名
        name: friend.name || friend.username, // 确保name字段存在
        avatar: getAvatarForUser(friend.email) // 生成固定的头像
      }));
      
      const combinedFriends = [selfUser, ...friendsWithAttributes.filter(f => f.id !== selfUser.id)];
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
    
    // 检查是否已经发送过请求
    if (sentFriendRequests.includes(friend.email)) {
      console.log('好友请求已发送，请等待对方确认');
      return;
    }
    
    // 检查是否已经是好友
    if (friendsList.some(f => f.id === friend.id && !f.isSelf)) {
      console.log(`${friend.name} 已经是您的好友了`);
      return;
    }
    
    try {
      await api.addFriend(friend.email);
      // 添加到已发送请求列表
      setSentFriendRequests(prev => [...prev, friend.email]);
      console.log(`已向 ${friend.name} 发送好友请求`);
    } catch (error) {
      console.error('发送好友请求失败:', error);
      alert('发送好友请求失败，请重试');
    }
  };

  // 处理接受和拒绝好友请求
  const handleAcceptRequest = async (request) => {
    try {
      if (request.id) {
        await api.acceptFriendRequest(request.id);
        
        // 添加新好友到好友列表，确保设置正确的好友属性
        const newFriend = {
          ...request.from,
          id: request.from.id || request.from.email, // 确保有id
          email: request.from.email, // 确保email字段存在
          account: request.from.email, // 账号就是邮箱
          signature: getSignatureForUser(request.from.email), // 生成固定的个性签名
          name: request.from.name || request.from.username, // 确保name字段存在
          avatar: getAvatarForUser(request.from.email), // 生成固定的头像
          isFriend: true,
          isSelf: false,
          isOnline: true // 默认在线状态
        };
        
        setFriendsList(prev => {
          // 先检查是否已经存在该好友，避免重复添加
          const existingFriend = prev.find(f => f.id === newFriend.id);
          if (existingFriend) {
            // 如果已存在，更新其属性
            return prev.map(f => f.id === newFriend.id ? { ...f, isFriend: true } : f);
          } else {
            // 如果不存在，添加新好友
            return [...prev, newFriend];
          }
        });
        
        // 从待处理请求中移除
        setReceivedRequests(prev => prev.filter(r => r.id !== request.id));
        
        // 如果当前选中的是这个新好友，更新其状态
        setSelectedFriend(prev => {
          if (prev && prev.id === newFriend.id) {
            return { ...prev, isFriend: true };
          }
          return prev;
        });
        
        console.log(`已添加 ${request.from.name} 为好友`);
      }
    } catch (e) {
      console.error('接受好友请求失败:', e.message || e);
      alert('接受好友请求失败，请重试');
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      if (request.id) {
        await api.rejectFriendRequest(request.id);
        
        // 从待处理请求中移除
        setReceivedRequests(prev => prev.filter(r => r.id !== request.id));
        
        console.log('已拒绝好友请求');
      }
    } catch (e) {
      console.error('拒绝好友请求失败:', e.message || e);
      alert('拒绝好友请求失败，请重试');
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

  // Socket.IO 事件处理
  useEffect(() => {
    // 连接到Socket.IO服务器
    socketClient.connect();

    // 监听来自服务器的消息
    socketClient.on('message', (message) => {
      console.log('收到消息:', message);
      // 这里可以根据需要处理接收到的消息
    });

    // 监听好友状态变化
    socketClient.on('friendStatusChanged', (friendId, isOnline) => {
      console.log(`好友 ${friendId} 状态更新: ${isOnline ? '在线' : '离线'}`);
      setFriendsList(prevFriends => prevFriends.map(friend =>
        friend.id === friendId ? { ...friend, isOnline } : friend
      ));
    });

    // 监听新好友请求
    socketClient.on('friendRequestReceived', (request) => {
      console.log('收到新的好友请求:', request);
      setReceivedRequests(prevRequests => [...prevRequests, request]);
    });

    // 监听好友请求被接受
    socketClient.on('friendRequestAccepted', (friend) => {
      console.log('好友请求已被接受:', friend);
      setFriendsList(prev => [...prev, { ...friend, isFriend: true }]);
      setReceivedRequests(prev => prev.filter(r => r.id !== friend.id));
    });

    // 监听好友请求被拒绝
    socketClient.on('friendRequestRejected', (requestId) => {
      console.log('好友请求已被拒绝:', requestId);
      setReceivedRequests(prev => prev.filter(r => r.id !== requestId));
    });

    // 组件卸载时断开连接
    return () => {
      socketClient.disconnect();
    };
  }, []);

  // 删除好友后刷新本地好友列表和后端同步
  const handleFriendDeleted = async (friendId) => {
    setFriendsList(prev => {
      const updatedList = prev.filter(f => f.id !== friendId && !f.isSelf);
      // 如果当前选中的是被删好友，则切换到自己
      setSelectedFriend(currentSelected => {
        if (currentSelected && currentSelected.id === friendId) {
          // 确保从最新的列表中找到"我"
          return updatedList.find(f => f.isSelf);
        }
        return currentSelected;
      });
      return updatedList; // 返回更新后的列表
    });
    
    // 同时更新searchResults中的好友状态，如果当前显示的是搜索结果
    if (showSearchResults) {
      setSearchResults(prev => prev.map(user => 
        user.id === friendId ? { ...user, isFriend: false } : user
      ));
    }
    
    // 可选：刷新后端数据，确保同步
    await handleRefreshPage();
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
            src="/Icon/logo.png"
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
          sentFriendRequests={sentFriendRequests}
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
