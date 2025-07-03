import React, { useState, useRef, useEffect } from 'react';
import api from '../../utils/api.js';
import globalSocket from '../../utils/globalSocket.js';
import encryptionManager from '../../utils/encryption.js';
import { getAvatarDisplay } from '../../utils/avatarUtils.js';
import VideoBubble from '../components/VideoBubble.jsx';
import ChatInputBar from '../components/ChatInputBar.jsx';
import ChatListPage from '../components/ChatListPage.jsx';
import VideoCallModal from '../components/VideoCallModal.jsx';
import VoiceChatModal from '../components/VoiceChat.jsx';

const ChatPage = ({ onNavigateToFriends, currentUser, onLogout, selectedContact }) => {
  // 添加彩虹动画样式
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes rainbow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // 当前聊天对象ID（好友邮箱）
  const [currentChatId, setCurrentChatId] = useState(selectedContact?.email || null);
  // 消息列表
  const [messages, setMessages] = useState([]);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isChatListOpen, setIsChatListOpen] = useState(false);
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false);
  // 最近聊天列表
  const [recentChats, setRecentChats] = useState([]);

  const [contactInfo, setContactInfo] = useState({
    name: selectedContact?.name || "♪(((*°▽°*)八(*°▽°*)))欢迎来到窝语(((*°▽°*)八(*°▽°*)))♪",
    isOnline: selectedContact?.isOnline || true,
    isWelcome: !selectedContact, // 如果没有选择好友则显示欢迎语
  });

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 拉取消息和联系人信息
  useEffect(() => {
    if (!currentChatId) {
      // 如果没有选择聊天对象，显示欢迎语并清空消息
      setContactInfo({
        name: "♪(((*°▽°*)八(*°▽°*)))欢迎来到窝语(((*°▽°*)八(*°▽°*)))♪",
        isOnline: true,
        isWelcome: true,
      });
      setMessages([]);
      return;
    }
    
    // 初始化加密管理器公钥
    const initializeEncryption = async () => {
      try {
        // 设置当前用户的公钥到后端
        await api.request('/crypto/public-key', {
          method: 'POST',
          body: JSON.stringify({
            public_key: encryptionManager.getPublicKey()
          })
        });
        console.log('🔐 公钥已上传到后端');
        
        // 尝试获取对方的公钥进行密钥协商
        const peerKeyResult = await api.getUserPublicKey(currentChatId);
        if (peerKeyResult.public_key) {
          await encryptionManager.keyExchange(currentChatId, peerKeyResult.public_key);
          console.log('🤝 密钥协商完成');
        }
      } catch (error) {
        console.error('🔐 加密初始化失败:', error);
      }
    };
    
    initializeEncryption();
    
    // 获取消息历史（包括文本和图片）
    const loadChatHistory = async () => {
      try {
        // 加载文本消息
        const textRes = await api.getChatMessages(currentChatId);
        let allMessages = textRes.messages || [];
        
        // 加载图片消息
        try {
          const imageRes = await api.getChatImages(currentChatId);
          const imageMessages = imageRes.images || [];
          allMessages = [...allMessages, ...imageMessages];
        } catch (imageError) {
          console.warn('获取图片消息失败（可能还未实现）:', imageError);
        }
        
        // 按时间戳排序
        allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        const formattedMessages = allMessages.map(msg => {
          // 获取发送者的头像信息
          let avatarDisplay;
          if (msg.isOwn) {
            avatarDisplay = getAvatarDisplay(currentUser);
          } else {
            // 从recentChats或selectedContact中获取联系人信息
            const contact = recentChats.find(chat => 
              chat.email === currentChatId || chat.id === currentChatId
            ) || selectedContact;
            
            if (contact) {
              avatarDisplay = getAvatarDisplay(contact);
            } else {
              // 如果没有联系人信息，使用邮箱生成固定头像
              avatarDisplay = getAvatarDisplay({ email: currentChatId });
            }
          }
          
          return {
            ...msg,
            timestamp: formatMessageTime(msg.timestamp),
            avatar: avatarDisplay
          };
        });
        
        setMessages(formattedMessages);
        console.log('历史消息加载完成:', formattedMessages.length, '条消息');
        // 延迟滚动到底部，确保消息已渲染
        setTimeout(scrollToBottom, 100);
      } catch (err) {
        console.error('获取消息失败:', err);
        setMessages([]);
      }
    };
    
    loadChatHistory();
    
    // 更新联系人信息
    setContactInfo({
      name: selectedContact?.name || '未知用户',
      isOnline: selectedContact?.isOnline || false,
      isWelcome: false
    });
  }, [currentChatId, selectedContact]);

  // 加载最近聊天列表
  useEffect(() => {
    const loadRecentChats = async () => {
      try {
        const res = await api.getRecentChats();
        setRecentChats(res.chats || []);
      } catch (error) {
        console.error('加载最近聊天失败:', error);
        setRecentChats([]);
      }
    };
    
    if (currentUser?.email) {
      loadRecentChats();
    }
  }, [currentUser]);

  // 格式化消息时间为年月日时间格式
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // 今天：显示完整的年月日时间
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      // 其他日期：显示完整的年月日时间
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
  };

  // 当selectedContact变化时，更新当前聊天对象
  useEffect(() => {
    if (selectedContact?.email) {
      setCurrentChatId(selectedContact.email);
    }
  }, [selectedContact]);

  // Socket.IO 实时消息监听
  useEffect(() => {
    if (!currentUser?.email) {
      console.log('用户邮箱未设置，跳过Socket连接');
      return;
    }

    // 初始化全局Socket连接
    globalSocket.initialize(currentUser);

    // 创建消息处理器
    const handleNewMessage = async (message) => {
      console.log('ChatPage收到新消息:', message);
      
      // 获取发送者头像
      const senderContact = recentChats.find(chat => 
        chat.email === message.sender_id || chat.id === message.sender_id
      );
      
      let senderAvatar;
      if (senderContact) {
        senderAvatar = getAvatarDisplay(senderContact);
      } else {
        // 如果没有联系人信息，使用邮箱生成固定头像
        senderAvatar = getAvatarDisplay({ email: message.sender_id });
      }
      
      // 只有当消息的发送者是当前聊天对象时才在当前聊天窗口中显示
      const shouldDisplayInCurrentChat = message.sender_id === currentChatId;
      
      if (shouldDisplayInCurrentChat) {
        // 检查是否是加密隐写消息
        if (message.encrypted_image) {
          try {
            // 解密隐写消息
            const decryptedData = await encryptionManager.decryptAndExtractMessage(
              message.encrypted_image, 
              message.sender_id
            );
            
            // 更新消息内容为解密后的明文
            const decryptedMessage = {
              ...message,
              content: decryptedData.content,
              audioUrl: decryptedData.type === 'audio' ? decryptedData.content : null, // 为语音消息设置audioUrl
              type: decryptedData.type,
              isDecrypted: true,
              timestamp: formatMessageTime(message.timestamp),
              avatar: senderAvatar
            };
            
            setMessages(prev => [...prev, decryptedMessage]);
            console.log('🔓 消息解密成功');
            setTimeout(scrollToBottom, 100);
          } catch (error) {
            console.error('❌ 消息解密失败:', error);
            // 如果解密失败，仍显示原消息
            const formattedMessage = {
              ...message,
              audioUrl: message.type === 'audio' ? message.content : null, // 为语音消息设置audioUrl
              timestamp: formatMessageTime(message.timestamp),
              avatar: senderAvatar
            };
            setMessages(prev => [...prev, formattedMessage]);
            setTimeout(scrollToBottom, 100);
          }
        } else {
          // 普通消息直接显示
          const formattedMessage = {
            ...message,
            audioUrl: message.type === 'audio' ? message.content : null, // 为语音消息设置audioUrl
            timestamp: formatMessageTime(message.timestamp),
            avatar: senderAvatar
          };
          setMessages(prev => [...prev, formattedMessage]);
          setTimeout(scrollToBottom, 100);
        }
      }
      
      // 无论是否在当前聊天窗口显示，都要更新最近聊天列表
      await updateRecentChats();
    };

    // 注册消息处理器
    globalSocket.addMessageHandler(handleNewMessage);

    // 清理函数
    return () => {
      globalSocket.removeMessageHandler(handleNewMessage);
    };
  }, [currentUser, currentChatId, recentChats]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送文本消息（加密隐写版本）
  const handleSendMessage = async (messageText) => {
    if (!currentChatId || !messageText) return;
    
    try {
      console.log('🔐 开始加密发送消息...');
      
      // 使用加密管理器加密并隐写消息
      const { encryptedImageBase64, sessionKey } = await encryptionManager.encryptAndHideMessage(
        messageText, 
        currentChatId, 
        'text'
      );
      
      // 发送加密隐写后的消息到后端
      const res = await api.sendEncryptedMessage(currentChatId, messageText, 'text', encryptedImageBase64);
      
      if (res.message) {
        // 在本地消息列表中显示明文版本
        const localMessage = {
          ...res.message,
          content: messageText, // 显示原始明文
          isEncrypted: true,
          type: 'text',
          timestamp: formatMessageTime(res.message.timestamp),
          avatar: getAvatarDisplay(currentUser)
        };
        setMessages(prev => [...prev, localMessage]);
        setTimeout(scrollToBottom, 100);
        console.log('✅ 加密消息发送成功');
        
        // 更新最近聊天列表
        await updateRecentChats();
      }
    } catch (e) {
      console.error('❌ 加密消息发送失败:', e);
      
      // 如果加密失败，降级发送普通消息
      try {
        console.log('📝 降级发送普通消息...');
        const res = await api.sendTextMessage(currentChatId, messageText, 'text');
        if (res.message) {
          const formattedMessage = {
            ...res.message,
            timestamp: formatMessageTime(res.message.timestamp),
            avatar: getAvatarDisplay(currentUser)
          };
          setMessages(prev => [...prev, formattedMessage]);
          setTimeout(scrollToBottom, 100);
          await updateRecentChats();
        }
      } catch (fallbackError) {
        console.error('普通消息发送也失败:', fallbackError);
        alert(fallbackError.message || '消息发送失败');
      }
    }
  };

  const handleVideoCall = () => {
    setIsVideoCallOpen(true);
  };

  //___________________________________________________________________________
  // 发送图片消息：选择图片，加密隐写传输
  const handleSendImage = () => {
    if (!currentChatId) return;
    // 创建一个隐藏的文件选择框
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // 检查文件大小限制（50MB）
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        alert(`图片文件过大！最大支持50MB，当前文件大小：${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return;
      }
      
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const imageBase64 = event.target.result;
          const fileName = file.name;
          const fileSize = file.size;
          
          console.log(`🖼️ 开始发送图片... 文件大小：${(fileSize / 1024 / 1024).toFixed(2)}MB`);
          
          try {
            // 首选方式：使用加密管理器加密图片数据
            const { encryptedImageBase64, sessionKey } = await encryptionManager.encryptAndHideMessage(
              imageBase64, 
              currentChatId, 
              'image'
            );
            
            // 发送加密隐写后的图片消息
            const res = await api.sendEncryptedMessage(currentChatId, imageBase64, 'image', encryptedImageBase64);
            
            if (res.message) {
              // 在本地消息列表中显示原图片
              const localImageMsg = {
                ...res.message,
                content: imageBase64, // 显示原始图片
                type: 'image',
                isEncrypted: true,
                timestamp: formatMessageTime(res.message.timestamp),
                avatar: getAvatarDisplay(currentUser)
              };
              setMessages(prev => [...prev, localImageMsg]);
              setTimeout(scrollToBottom, 100);
              console.log('✅ 加密图片发送成功');
              
              // 更新最近聊天列表
              await updateRecentChats();
            }
          } catch (encryptError) {
            console.warn('⚠️ 图片加密失败，尝试普通发送:', encryptError);
            
            // 降级：发送普通图片消息到数据库
            try {
              const res = await api.sendImageMessage(currentChatId, imageBase64, fileName, fileSize);
              if (res.message) {
                const localImageMsg = {
                  ...res.message,
                  timestamp: formatMessageTime(res.message.timestamp),
                  avatar: getAvatarDisplay(currentUser)
                };
                setMessages(prev => [...prev, localImageMsg]);
                setTimeout(scrollToBottom, 100);
                console.log('✅ 普通图片发送成功');
                
                // 更新最近聊天列表
                await updateRecentChats();
              }
            } catch (fallbackError) {
              console.error('❌ 普通图片发送也失败:', fallbackError);
              alert('图片发送失败，请重试');
            }
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('❌ 图片处理失败:', error);
        alert('图片处理失败，请重试');
      }
    };
    input.click();
  };
  //___________________________________________________________________________

  const handleSendVoice = () => {
    setIsVoiceChatOpen(true);
  };

  // 发送语音消息（加密隐写版本）
  const handleVoiceMessageSent = async (audioBlob) => {
    if (!currentChatId || !audioBlob) return;
    
    try {
      console.log('🎙️ 开始发送语音消息...');
      
      // 将 Blob 转换为 base64
      const reader = new FileReader();
      reader.onload = async () => {
        const audioBase64 = reader.result;
        
        try {
          // 尝试加密发送
          const { encryptedImageBase64, sessionKey } = await encryptionManager.encryptAndHideMessage(
            audioBase64, 
            currentChatId, 
            'audio'
          );
          
          // 发送加密隐写后的语音消息
          const res = await api.sendEncryptedMessage(currentChatId, audioBase64, 'audio', encryptedImageBase64);
          
          if (res.message) {
            // 在本地消息列表中显示原语音
            const localVoiceMsg = {
              ...res.message,
              content: audioBase64, // 显示原始语音
              audioUrl: audioBase64, // 为语音播放提供数据源
              type: 'audio',
              isEncrypted: true,
              timestamp: formatMessageTime(res.message.timestamp),
              avatar: getAvatarDisplay(currentUser)
            };
            setMessages(prev => [...prev, localVoiceMsg]);
            setTimeout(scrollToBottom, 100);
            console.log('✅ 加密语音发送成功');
          }
        } catch (encryptError) {
          console.warn('⚠️ 语音加密失败，尝试普通发送:', encryptError);
          
          // 降级：发送普通文本消息表示语音
          try {
            const res = await api.sendTextMessage(currentChatId, '🎤 语音消息', 'audio');
            if (res.message) {
              const localVoiceMsg = {
                ...res.message,
                content: audioBase64,
                audioUrl: audioBase64,
                type: 'audio',
                timestamp: formatMessageTime(res.message.timestamp),
                avatar: getAvatarDisplay(currentUser)
              };
              setMessages(prev => [...prev, localVoiceMsg]);
              setTimeout(scrollToBottom, 100);
              console.log('✅ 普通语音发送成功');
            }
          } catch (fallbackError) {
            console.error('❌ 语音发送完全失败:', fallbackError);
            alert('语音发送失败，请稍后重试');
          }
        }
      };
      
      reader.readAsDataURL(audioBlob);
      
    } catch (error) {
      console.error('❌ 语音消息发送失败:', error);
      alert('语音消息发送失败：' + error.message);
    }
    
    // 关闭语音录音模态框
    setIsVoiceChatOpen(false);
  };

  const handleNavigateToFriends = () => {
    onNavigateToFriends();
  };

  const handleRefreshChat = () => {
    window.location.reload();
  };

  const handleSwitchChat = async (chatId) => {
    console.log('切换聊天到:', chatId);
    setCurrentChatId(chatId);
    setIsChatListOpen(false);
    
    // 找到对应的聊天信息
    const selectedChat = recentChats.find(chat => chat.id === chatId || chat.email === chatId);
    if (selectedChat) {
      setContactInfo({
        name: selectedChat.name,
        isOnline: selectedChat.isOnline,
        isWelcome: false
      });
    }
    
    // 重新加载该聊天的消息历史
    try {
      const res = await api.getChatMessages(chatId);
      const formattedMessages = res.messages.map(msg => {
        // 获取正确的头像信息
        let avatarDisplay;
        if (msg.isOwn) {
          avatarDisplay = getAvatarDisplay(currentUser);
        } else {
          avatarDisplay = selectedChat ? getAvatarDisplay(selectedChat) : 
            msg.sender_id?.charAt(0)?.toUpperCase() || '?';
        }
        
        return {
          ...msg,
          timestamp: formatMessageTime(msg.timestamp),
          avatar: avatarDisplay
        };
      });
      setMessages(formattedMessages);
      // 滚动到最新消息
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('切换聊天时加载消息失败:', error);
      setMessages([]);
    }
  };

  // 更新最近聊天列表
  const updateRecentChats = async () => {
    try {
      const res = await api.getRecentChats();
      setRecentChats(res.chats || []);
    } catch (error) {
      console.error('更新最近聊天失败:', error);
    }
  };

  const containerStyle = {
    display: 'flex',
    flexDirection: 'row',
    height: '100vh',
    backgroundImage: 'url("/background/ChatBack.png")', // 使用 background 文件夹下的 ChatBack.png 作为背景
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
              src="/Icon/logo.png" // 使用 Icon 文件夹下的 logo
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
            <span style={{ 
              fontSize: '30px', 
              fontWeight: contactInfo.isWelcome ? 'bold' : '500', 
              color: contactInfo.isWelcome ? 'transparent' : '#212529',
              background: contactInfo.isWelcome ? 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #f9ca24, #f0932b, #eb4d4b, #6c5ce7)' : 'none',
              backgroundSize: contactInfo.isWelcome ? '400% 400%' : 'auto',
              backgroundClip: contactInfo.isWelcome ? 'text' : 'border-box',
              WebkitBackgroundClip: contactInfo.isWelcome ? 'text' : 'border-box',
              WebkitTextFillColor: contactInfo.isWelcome ? 'transparent' : '#212529',
              animation: contactInfo.isWelcome ? 'rainbow 3s ease-in-out infinite' : 'none',
            }}>
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
             <NavButton
              onClick={typeof onLogout === 'function' ? onLogout : () => {}}
              title="退出登录"
            >
              🚪
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
          chatList={recentChats}
          currentChatId={currentChatId}
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