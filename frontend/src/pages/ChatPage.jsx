import React, { useState, useRef, useEffect } from 'react';
import VideoBubble from '../components/VideoBubble.jsx';
import ChatInputBar from '../components/ChatInputBar.jsx';
import ChatListPage from '../components/ChatListPage.jsx';
import VideoCallModal from '../components/VideoCallModal.jsx';
import VoiceChatModal from '../components/VoiceChat.jsx';

const ChatPage = ({ onNavigateToFriends, currentUser }) => {
  // 模拟不同用户的聊天数据
  const [allChats] = useState({
    1: [
      { id: 1, type: 'text', content: "你好！今天天气不错呢", isOwn: false, timestamp: "14:20", avatar: "2.png" },
      { id: 2, type: 'text', content: "是的，很适合出去走走", isOwn: true, timestamp: "14:21", avatar: currentUser?.avatar || "1.png" },
      { id: 3, type: 'text', content: "周末有什么计划吗？", isOwn: false, timestamp: "14:22", avatar: "2.png" },
      { id: 4, type: 'text', content: "想去公园拍照，你要一起来吗？", isOwn: true, timestamp: "14:23", avatar: currentUser?.avatar || "1.png" },
    ],
    2: [
      { id: 1, type: 'text', content: "会议资料我已经准备好了", isOwn: false, timestamp: "12:15", avatar: "3.png" },
      { id: 2, type: 'text', content: "太好了，明天见！", isOwn: true, timestamp: "12:16", avatar: currentUser?.avatar || "1.png" },
    ],
    3: [
      { id: 1, type: 'text', content: "周末一起去看电影吧！", isOwn: false, timestamp: "昨天", avatar: "4.png" },
      { id: 2, type: 'text', content: "好的，看什么电影？", isOwn: true, timestamp: "昨天", avatar: currentUser?.avatar || "1.png" },
    ],
  });

  const [currentChatId, setCurrentChatId] = useState(1);
  const [messages, setMessages] = useState(allChats[currentChatId]);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isChatListOpen, setIsChatListOpen] = useState(false);
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false);

  const [contactInfo, setContactInfo] = useState({
    name: "张三",
    isOnline: true,
  });

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setMessages(allChats[currentChatId] || []);
    const contacts = {
      1: { name: "张三", isOnline: true },
      2: { name: "李四", isOnline: false },
      3: { name: "王五", isOnline: true },
    };
    setContactInfo(contacts[currentChatId] || { name: "未知用户", isOnline: false });
  }, [currentChatId, allChats]);

  const handleSendMessage = (messageText) => {
    const newMessage = {
      id: Date.now(),
      type: 'text',
      content: messageText,
      isOwn: true,
      timestamp: new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      avatar: currentUser?.avatar || "1.png"
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleVideoCall = () => {
    setIsVideoCallOpen(true);
  };

  //___________________________________________________________________________
  const handleSendImage = () => {
    const imageMessage = {
      id: Date.now(),
      type: 'text',
      content: "📷 [图片]",
      isOwn: true,
      timestamp: new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      avatar: currentUser?.avatar || "1.png"
    };
    setMessages(prev => [...prev, imageMessage]);
  };
  //___________________________________________________________________________ 

  const handleSendVoice = () => {
    setIsVoiceChatOpen(true);
  };

  const handleVoiceMessageSent = (audioUrl) => {
    const voiceMessage = {
      id: Date.now(),
      type: 'audio',
      content: audioUrl,
      isOwn: true,
      timestamp: new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      avatar: currentUser?.avatar || "1.png"
    };
    setMessages(prev => [...prev, voiceMessage]);
    setIsVoiceChatOpen(false);
    console.log("Voice message sent, URL:", audioUrl);
  };

  const handleNavigateToFriends = () => {
    onNavigateToFriends();
  };

  const handleRefreshChat = () => {
    window.location.reload();
  };

  const handleSwitchChat = (chatId) => {
    setCurrentChatId(chatId);
    setIsChatListOpen(false);
  };

  const containerStyle = {
    display: 'flex',
    flexDirection: 'row',
    height: '100vh',
    backgroundImage: 'url("/ChatBack.png")', // 使用 assets 下的 ChatBack.png 作为背景
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    minWidth: '1200px',
    width: '100vw',
    boxSizing: 'border-box',
  };

  const leftPanelStyle = {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'rgba(255,255,255,0.35)', // 半透明白色
    minWidth: '600px',
    maxWidth: isChatListOpen ? 'calc(100vw - 350px)' : '100vw',
  };

  const rightPanelStyle = {
    width: '350px',
    backgroundColor: 'rgba(255,255,255,0.2)', // 半透明白色
    //borderLeft: '1px solid #f8bbd9',
    display: isChatListOpen ? 'flex' : 'none',
    flexDirection: 'column',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #f8bbd9',
    boxShadow: '0 2px 4px rgba(233, 30, 99, 0.1)',
    minHeight: '70px',
    justifyContent: 'space-between',
  };

  // === 修改 logoStyle ===
  const logoStyle = {
    width: '40px',
    height: '40px',
    backgroundColor: '#e91e63', // 背景色保留，或者改为透明 'transparent'
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // 移除了 color 和 fontSize，因为我们将用图片替代文本
    marginRight: '16px',
    overflow: 'hidden', // 确保图片超出边界时被裁剪
  };

  const contactInfoStyle = {
    display: 'flex',
    alignItems: 'center',
  };

  const statusDotStyle = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: contactInfo.isOnline ? '#4caf50' : '#9e9e9e',
    marginLeft: '8px',
  };

  const navButtonStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '40px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'all 0.2s ease',
    margin: '0',
  };

  const navButtonsContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  };

  const chatAreaStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '0 20%',
  };

  const messagesScrollStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const chatListToggleStyle = {
    position: 'fixed',
    right: isChatListOpen ? 'calc(350px + 2vw)' : '2vw',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '50px',
    height: '50px',
    backgroundColor: '#e91e63',
    borderRadius: '25px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(233, 30, 99, 0.3)',
    transition: 'all 0.3s ease',
    zIndex: 100,
    color: '#ffffff',
    fontSize: '18px',
  };

  const NavButton = ({ onClick, children, title, isActive = false }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <button
        style={{
          ...navButtonStyle,
          backgroundColor: isActive
            ? '#fce4ec'
            : isHovered
              ? '#f8bbd9'
              : 'transparent',
          color: isActive ? '#e91e63' : '#424242',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        title={title}
      >
        {children}
      </button>
    );
  };

  return (
    <div style={containerStyle}>
      {/* Left main chat area */}
      <div style={leftPanelStyle}>
        {/* Top bar */}
        <div style={headerStyle}>
          {/* === 修改这里，用 <img> 标签替换 'C' === */}
          <div style={logoStyle}>
            <img
              src="/logo.png" // 假设图片在 public/images 目录下
              alt="Logo"
              style={{
                width: '100%', // 让图片填充 logoStyle 的 div
                height: '100%',
                objectFit: 'cover', // 确保图片覆盖整个区域，可能会裁剪
                borderRadius: '8px', // 与 logoStyle 的圆角保持一致
              }}
            />
          </div>
          {/* === 结束修改 === */}
          <div style={contactInfoStyle}>
            <span style={{ fontSize: '30px', fontWeight: '500', color: '#212529' }}>
              {contactInfo.name}
            </span>
            <div style={statusDotStyle}></div>
          </div>
          <div style={navButtonsContainerStyle}>
            <NavButton onClick={handleNavigateToFriends} title="好友列表">
              👥
            </NavButton>
            <NavButton onClick={handleRefreshChat} title="刷新聊天" isActive={true}>
              💬
            </NavButton>
          </div>
        </div>

        {/* Chat area */}
        <div style={chatAreaStyle}>
          <div style={messagesScrollStyle}>
            {messages.map((message) => (
              <VideoBubble
                key={message.id}
                message={message.type === 'audio' ? null : message.content}
                audioUrl={message.type === 'audio' ? message.content : null}
                isOwn={message.isOwn}
                timestamp={message.timestamp}
                avatar={message.avatar}
                type={message.type}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <ChatInputBar
            onSendMessage={handleSendMessage}
            onVideoCall={handleVideoCall}
            onSendImage={handleSendImage}
            onSendVoice={handleSendVoice}
          />
        </div>
      </div>

      {/* Right ChatList panel */}
      <div style={rightPanelStyle}>
        <ChatListPage
          isVisible={true}
          onClose={() => setIsChatListOpen(false)}
          onSwitchChat={handleSwitchChat}
        />
      </div>

      {/* ChatList toggle button */}
      <button
        style={chatListToggleStyle}
        onClick={() => setIsChatListOpen(!isChatListOpen)}
        title={isChatListOpen ? "关闭消息列表" : "打开消息列表"}
      >
        {isChatListOpen ? '❯' : '❮'}
      </button>

      {/* Video call modal */}
      <VideoCallModal
        isOpen={isVideoCallOpen}
        onClose={() => setIsVideoCallOpen(false)}
        contactName={contactInfo.name}
      />

      {/* Voice chat modal */}
      <VoiceChatModal
        isOpen={isVoiceChatOpen}
        onClose={() => setIsVoiceChatOpen(false)}
        onSendVoice={handleVoiceMessageSent}
      />
    </div>
  );
};

export default ChatPage;