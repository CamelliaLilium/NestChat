import React, { useState, useRef, useEffect } from 'react';
import VideoBubble from '../components/VideoBubble.jsx'; // Changed from ChatBubble to VideoBubble
import ChatInputBar from '../components/ChatInputBar.jsx';
import ChatListPage from '../components/ChatListPage.jsx';
import VideoCallModal from '../components/VideoCallModal.jsx';
import VoiceChatModal from '../components/VoiceChat.jsx'; // 引入新的 VoiceChatModal 组件

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

  const [currentChatId, setCurrentChatId] = useState(1); // Current chat ID
  const [messages, setMessages] = useState(allChats[currentChatId]); // Current chat messages
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false); // Video call modal state
  const [isChatListOpen, setIsChatListOpen] = useState(false); // ChatList panel open/close state
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false); // Voice chat modal open/close state

  const [contactInfo, setContactInfo] = useState({
    name: "张三", // Contact name
    isOnline: true, // Contact online status
  });

  const messagesEndRef = useRef(null); // Ref for scrolling to the bottom of messages

  // Function to scroll to the bottom of the messages list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Effect to scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Effect to update messages and contact info when currentChatId or allChats change
  useEffect(() => {
    setMessages(allChats[currentChatId] || []); // Update current chat messages
    // Update contact info based on chat ID
    const contacts = {
      1: { name: "张三", isOnline: true },
      2: { name: "李四", isOnline: false },
      3: { name: "王五", isOnline: true },
    };
    setContactInfo(contacts[currentChatId] || { name: "未知用户", isOnline: false });
  }, [currentChatId, allChats]);

  // Handle sending a text message
  const handleSendMessage = (messageText) => {
    const newMessage = {
      id: Date.now(), // Unique ID for the message
      type: 'text', // Message type: text
      content: messageText, // Message content
      isOwn: true, // Flag if the message is sent by the current user
      timestamp: new Date().toLocaleTimeString('zh-CN', { // Current time
        hour: '2-digit',
        minute: '2-digit'
      }),
      avatar: currentUser?.avatar || "1.png" // Current user's avatar
    };
    setMessages(prev => [...prev, newMessage]); // Add new message to the list
  };

  // Handle video call initiation
  const handleVideoCall = () => {
    setIsVideoCallOpen(true); // Open video call modal
  };

  // Handle sending an image (simulated)
  const handleSendImage = () => {
    const imageMessage = {
      id: Date.now(),
      type: 'text', // Message type: text (image as text placeholder)
      content: "📷 [图片]", // Image placeholder text
      isOwn: true,
      timestamp: new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      avatar: currentUser?.avatar || "1.png"
    };
    setMessages(prev => [...prev, imageMessage]);
  };

  // Handle sending voice (opens voice chat modal)
  const handleSendVoice = () => {
    setIsVoiceChatOpen(true); // Open voice chat modal
  };

  // Callback for when voice message is successfully sent from VoiceChatModal
  const handleVoiceMessageSent = (audioUrl) => {
    // In a real application, audioUrl would be sent to the backend
    const voiceMessage = {
      id: Date.now(),
      type: 'audio', // Message type: audio
      content: audioUrl, // Audio URL
      isOwn: true,
      timestamp: new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      avatar: currentUser?.avatar || "1.png"
    };
    setMessages(prev => [...prev, voiceMessage]); // Add voice message to the list
    setIsVoiceChatOpen(false); // Close voice chat modal
    console.log("Voice message sent, URL:", audioUrl);
  };

  // Navigate to friends list page
  const handleNavigateToFriends = () => {
    onNavigateToFriends(); // Call parent component's navigation callback
  };

  // Refresh chat page
  const handleRefreshChat = () => {
    window.location.reload(); // Reload the entire page
  };

  // Switch chat contact
  const handleSwitchChat = (chatId) => {
    setCurrentChatId(chatId); // Set current chat ID
    setIsChatListOpen(false); // Close ChatList panel after switching chat
  };

  // Desktop adaptation: horizontal layout container style
  const containerStyle = {
    display: 'flex',
    flexDirection: 'row', // Horizontal layout
    height: '100vh', // Occupy full viewport height
    backgroundColor: '#fce4ec', // Background color
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', // Font family
    minWidth: '1200px', // Minimum width for desktop
    width: '100vw', // Occupy full viewport width
    boxSizing: 'border-box', // Box model
  };

  // Left main chat area style (dynamically adjusts based on isChatListOpen)
  const leftPanelStyle = {
    flex: '1', // Occupy available space
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    minWidth: '600px', // Minimum width
    // Dynamically adjust max-width based on isChatListOpen
    maxWidth: isChatListOpen ? 'calc(100vw - 350px)' : '100vw',
  };

  // Right ChatList panel style
  const rightPanelStyle = {
    width: '350px', // Fixed width
    backgroundColor: '#ffffff',
    borderLeft: '1px solid #f8bbd9', // Left border
    display: isChatListOpen ? 'flex' : 'none', // Show or hide based on isChatListOpen
    flexDirection: 'column',
  };

  // Header bar style
  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #f8bbd9',
    boxShadow: '0 2px 4px rgba(233, 30, 99, 0.1)',
    minHeight: '70px',
  };

  // Logo style
  const logoStyle = {
    width: '40px',
    height: '40px',
    backgroundColor: '#e91e63',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 'bold',
    marginRight: '16px',
  };

  // Contact info style
  const contactInfoStyle = {
    display: 'flex',
    alignItems: 'center',
  };

  // Online status dot style
  const statusDotStyle = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: contactInfo.isOnline ? '#4caf50' : '#9e9e9e',
    marginLeft: '8px',
  };

  // Nav button common style
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
    margin: '0', // Ensure no extra margin, gap controlled by container
  };

  // NavButtons container style, for centering these two buttons
  const navButtonsContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '15px', // Gap between buttons
  };

  // Chat area style
  const chatAreaStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '0 20px',
  };

  // Messages scroll area style
  const messagesScrollStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  // ChatList toggle button style
  const chatListToggleStyle = {
    position: 'fixed',
    right: isChatListOpen ? '360px' : '20px', // Adjust position based on ChatList panel state
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

  // NavButton sub-component
  const NavButton = ({ onClick, children, title, isActive = false }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <button
        style={{
          ...navButtonStyle,
          backgroundColor: isActive
            ? '#fce4ec' // Active state background color
            : isHovered
              ? '#f8bbd9' // Hover state background color
              : 'transparent', // Default transparent background
          color: isActive ? '#e91e63' : '#424242', // Active or default text color
        }}
        onMouseEnter={() => setIsHovered(true)} // Set hover state on mouse enter
        onMouseLeave={() => setIsHovered(false)} // Clear hover state on mouse leave
        onClick={onClick} // Click event
        title={title} // Mouse hover tooltip
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
          <div style={logoStyle}>C</div>
          <div style={contactInfoStyle}> {/* Removed flex:1, so it only occupies content space */}
            <span style={{ fontSize: '16px', fontWeight: '500', color: '#212529' }}>
              {contactInfo.name} {/* Display contact name */}
            </span>
            <div style={statusDotStyle}></div> {/* Display online status dot */}
          </div>
          {/* Flexible centering container, occupies remaining space and centers nav buttons */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={navButtonsContainerStyle}> {/* Navigation buttons container */}
              <NavButton onClick={handleNavigateToFriends} title="好友列表">
                👥 {/* Friends list icon */}
              </NavButton>
              <NavButton onClick={handleRefreshChat} title="刷新聊天" isActive={true}>
                💬 {/* Chat icon (current page active) */}
              </NavButton>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div style={chatAreaStyle}>
          <div style={messagesScrollStyle}>
            {messages.map((message) => (
              <VideoBubble // Changed from ChatBubble to VideoBubble
                key={message.id}
                // Pass different props based on message type
                message={message.type === 'audio' ? null : message.content} // Text message passes content
                audioUrl={message.type === 'audio' ? message.content : null} // Audio message passes audioUrl
                isOwn={message.isOwn}
                timestamp={message.timestamp}
                avatar={message.avatar}
                type={message.type} // Pass message type
              />
            ))}
            <div ref={messagesEndRef} /> {/* Empty div for scrolling to bottom */}
          </div>

          <ChatInputBar
            onSendMessage={handleSendMessage}
            onVideoCall={handleVideoCall}
            onSendImage={handleSendImage}
            onSendVoice={handleSendVoice} // Call function to handle voice sending
          />
        </div>
      </div>

      {/* Right ChatList panel */}
      <div style={rightPanelStyle}>
        <ChatListPage
          isVisible={true} // Always visible (controlled by parent's display)
          onClose={() => setIsChatListOpen(false)} // Close ChatList panel
          onSwitchChat={handleSwitchChat} // Switch chat contact
        />
      </div>

      {/* ChatList toggle button */}
      <button
        style={chatListToggleStyle}
        onClick={() => setIsChatListOpen(!isChatListOpen)} // Click to toggle ChatList panel visibility
        title={isChatListOpen ? "关闭消息列表" : "打开消息列表"} // Mouse hover tooltip
      >
        {isChatListOpen ? '❯' : '❮'} {/* Display different arrow icon based on state */}
      </button>

      {/* Video call modal */}
      <VideoCallModal
        isOpen={isVideoCallOpen} // Control video call modal visibility
        onClose={() => setIsVideoCallOpen(false)} // Close video call modal
        contactName={contactInfo.name} // Pass contact name
      />

      {/* Voice chat modal */}
      <VoiceChatModal
        isOpen={isVoiceChatOpen} // Control voice chat modal visibility
        onClose={() => setIsVoiceChatOpen(false)} // Close voice chat modal
        onSendVoice={handleVoiceMessageSent} // Pass voice sending callback
      />
    </div>
  );
};

export default ChatPage; // Export ChatPage component
