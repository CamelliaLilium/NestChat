import React, { useState, useEffect } from 'react';
import NavButton from '../components/NavButton.jsx';
import FriendsList from '../components/FriendsList.jsx';
import FriendDetail from '../components/FriendDetail.jsx';
import FriendRequestNotification from '../components/FriendRequestNotification.jsx';
import ChangeSign from '../components/ChangeSign.jsx';

const FriendsPage = ({ onNavigateToChat, onSelectFriend, currentUser, onAvatarChange }) => {
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
  const [currentSignature, setCurrentSignature] = useState("这是我的个性签名");

  // 创建包含自己的好友列表
  const createFriendsList = () => {
    const selfUser = {
      id: 'self',
      name: currentUser?.name || "我",
      account: currentUser?.email || "current_user",
      avatar: currentUser?.avatar || "1.png",
      signature: currentSignature,
      isOnline: true,
      isSelf: true,
      isFriend: true
    };

    const otherFriends = [
      {
        id: 1,
        name: "张三",
        account: "zhangsan001",
        avatar: "2.png",
        signature: "工作使我快乐",
        isOnline: true,
        isFriend: true
      },
      {
        id: 2,
        name: "李四",
        account: "lisi_dev",
        avatar: "3.png",
        signature: "代码改变世界",
        isOnline: false,
        isFriend: true
      },
      {
        id: 3,
        name: "王五",
        account: "wangwu2023",
        avatar: "4.png",
        signature: "学习永无止境",
        isOnline: true,
        isFriend: true
      },
      {
        id: 4,
        name: "赵六",
        account: "zhaoliu_sci",
        avatar: "5.png",
        signature: "探索科学的奥秘",
        isOnline: true,
        isFriend: true
      },
      {
        id: 5,
        name: "孙七",
        account: "sunqi_art",
        avatar: "6.png",
        signature: "艺术来源于生活",
        isOnline: false,
        isFriend: true
      },
    ];

    return [selfUser, ...otherFriends];
  };

  // 初始化数据
  useEffect(() => {
    const initialFriendsList = createFriendsList();
    setFriendsList(initialFriendsList);

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
          isFriend: false
        },
        {
          id: 7,
          name: "吴九",
          account: "wujiu_tech",
          avatar: "8.png",
          signature: "科技创新未来",
          isOnline: false,
          isFriend: false
        }
      ];
    };

    setAllUsers(createAllUsers());
  }, [currentUser]);

  const [contactInfo] = useState({
    name: currentUser?.name || "当前用户",
    isOnline: true,
  });

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

  const handleVideoCall = () => {
    console.log('发起视频通话');
  };

  const handleAddFriend = (friend) => {
    if (!friend) return;

    if (friendRequests.includes(friend.id)) {
      alert('好友请求已发送，请等待对方确认');
      return;
    }

    setFriendRequests([...friendRequests, friend.id]);
    alert(`已向 ${friend.name} 发送好友申请`);

    setReceivedRequests(prev => [...prev, {
      ...friend,
      requestId: Date.now()
    }]);
  };

  const handleAcceptRequest = (request) => {
    setFriendsList(prev => [
      ...prev,
      {
        ...request,
        isFriend: true
      }
    ]);

    setReceivedRequests(prev => prev.filter(r => r.requestId !== request.requestId));
    alert(`已添加 ${request.name} 为好友`);
  };

  const handleRejectRequest = (request) => {
    setReceivedRequests(prev => prev.filter(r => r.requestId !== request.requestId));
  };

  // 处理个性签名更改
  const handleChangeSignature = () => {
    setShowChangeSign(true);
  };

  const handleSaveSignature = (newSignature) => {
    setCurrentSignature(newSignature);
    // 更新好友列表中自己的签名
    setFriendsList(prev => prev.map(friend =>
      friend.id === 'self'
        ? { ...friend, signature: newSignature }
        : friend
    ));
    // 如果当前选中的是自己，也要更新selectedFriend
    if (selectedFriend && selectedFriend.id === 'self') {
      setSelectedFriend(prev => ({ ...prev, signature: newSignature }));
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
            src="/logo.png" // 假设图片在 public/logo.png
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
            onClick={handleRefreshPage} // FriendsPage 内部的刷新函数
            title="好友列表"
            isActive={true} // 当前页面是好友列表，所以 active
          >
            👥 {/* Friends list icon */}
          </NavButton>
          <NavButton
            onClick={onNavigateToChat} // 从 props 接收的导航到聊天页面函数
            title="聊天页面"
          >
            💬 {/* Chat icon */}
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
