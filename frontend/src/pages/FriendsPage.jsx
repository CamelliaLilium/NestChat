import React, { useState, useEffect } from 'react';
import NavButton from '../components/NavButton.jsx';
import FriendsList from '../components/FriendsList.jsx';
import FriendDetail from '../components/FriendDetail.jsx';
import { friendsStyles } from '../styles/friendsStyles.js';
import FriendRequestNotification from '../components/FriendRequestNotification.jsx';

const FriendsPage = ({ onNavigateToChat, onSelectFriend, currentUser, onAvatarChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [friendsList, setFriendsList] = useState([]); // 将 friendsList 改为状态变量

  // 创建包含自己的好友列表
  const createFriendsList = () => {
    const selfUser = {
      id: 'self',
      name: currentUser?.name || "我",
      account: currentUser?.email || "current_user",
      avatar: currentUser?.avatar || "1.png",
      signature: "这是我的个性签名",
      isOnline: true,
      isSelf: true,
      isFriend: true // 标记为好友
    };

    const otherFriends = [
      {
        id: 1,
        name: "张三",
        account: "zhangsan001",
        avatar: "2.png",
        signature: "工作使我快乐",
        isOnline: true,
        isFriend: true // 标记为好友
      },
      {
        id: 2,
        name: "李四",
        account: "lisi_dev",
        avatar: "3.png",
        signature: "代码改变世界",
        isOnline: false,
        isFriend: true // 标记为好友
      },
      {
        id: 3,
        name: "王五",
        account: "wangwu2023",
        avatar: "4.png",
        signature: "学习永无止境",
        isOnline: true,
        isFriend: true // 标记为好友
      },
      {
        id: 4,
        name: "赵六",
        account: "zhaoliu_sci",
        avatar: "5.png",
        signature: "探索科学的奥秘",
        isOnline: true,
        isFriend: true // 标记为好友
      },
      {
        id: 5,
        name: "孙七",
        account: "sunqi_art",
        avatar: "6.png",
        signature: "艺术来源于生活",
        isOnline: false,
        isFriend: true // 标记为好友
      },
    ];

    return [selfUser, ...otherFriends];
  };

  // 初始化数据
  useEffect(() => {
    // 初始化好友列表
    const initialFriendsList = createFriendsList();
    setFriendsList(initialFriendsList);
    
    // 创建所有用户列表（包含非好友）
    const createAllUsers = () => {
      return [
        ...initialFriendsList.filter(f => f.id !== 'self'),
        {
          id: 6,
          name: "钱八",
          account: "qianba_music",
          avatar: "7.png",
          signature: "音乐是我的生命",
          isOnline: true,
          isFriend: false // 非好友
        },
        {
          id: 7,
          name: "吴九",
          account: "wujiu_tech",
          avatar: "8.png",
          signature: "科技创新未来",
          isOnline: false,
          isFriend: false // 非好友
        }
      ];
    };
    
    setAllUsers(createAllUsers());
  }, [currentUser]);

  const [contactInfo] = useState({
    name: currentUser?.name || "当前用户",
    isOnline: true,
  });

  // 修改搜索处理函数
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
        // 自动选择第一个搜索结果
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

  const handleNavigateToChat = () => {
    onNavigateToChat();
  };

  const handleRefreshPage = () => {
    window.location.reload();
  };

  // 按下发送消息按钮
  const handleSendMessage = (friend) => {
    if (!friend) return;
    
    setActiveChat(friend);
    onSelectFriend(friend); // 设置当前聊天好友
    onNavigateToChat(); // 触发父组件的页面跳转
  };

  const handleVideoCall = () => {
    console.log('发起视频通话');
  };

  // 添加好友函数
  const handleAddFriend = (friend) => {
    if (!friend) return;
    
    if (friendRequests.includes(friend.id)) {
      alert('好友请求已发送，请等待对方确认');
      return;
    }
    
    setFriendRequests([...friendRequests, friend.id]);
    alert(`已向 ${friend.name} 发送好友申请`);
    
    // 模拟接收好友请求（在实际应用中应从服务器接收）
    setReceivedRequests(prev => [...prev, {
      ...friend,
      requestId: Date.now() // 使用时间戳作为唯一ID
    }]);
  };

  // 处理好友请求（接受）
  const handleAcceptRequest = (request) => {
    // 添加到好友列表
    setFriendsList(prev => [
      ...prev, 
      {
        ...request,
        isFriend: true // 标记为好友
      }
    ]);
    
    // 从请求列表中移除
    setReceivedRequests(prev => prev.filter(r => r.requestId !== request.requestId));
    
    alert(`已添加 ${request.name} 为好友`);
  };

  // 处理好友请求（拒绝）
  const handleRejectRequest = (request) => {
    setReceivedRequests(prev => prev.filter(r => r.requestId !== request.requestId));
  };

  return (
    <div style={friendsStyles.containerStyle}>
      {/* 顶部栏 */}
      <div style={friendsStyles.headerStyle}>
        <div style={friendsStyles.logoStyle}>C</div>
        <div style={friendsStyles.contactInfoStyle}>
          <span style={{ fontSize: '16px', fontWeight: '500', color: '#212529' }}>
            {contactInfo.name}
          </span>
          <div style={friendsStyles.statusDotStyle(contactInfo.isOnline)}></div>
        </div>
        <NavButton
          onClick={handleRefreshPage}
          title="好友列表"
          isActive={true}
        >
          👥
        </NavButton>
        <NavButton
          onClick={handleNavigateToChat}
          title="聊天页面"
        >
          💬
        </NavButton>
      </div>

      {/* 主内容区 */}
      <div style={friendsStyles.mainContentStyle}>
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