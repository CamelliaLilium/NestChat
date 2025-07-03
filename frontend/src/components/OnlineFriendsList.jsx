/**
 * 在线好友列表组件
 * 显示当前在线的好友列表
 */
import React, { useState, useEffect } from 'react';
import OnlineStatusIndicator from './OnlineStatusIndicator.jsx';

const OnlineFriendsList = ({ 
  onSelectFriend = null, 
  showHeader = true,
  maxHeight = '300px',
  className = '' 
}) => {
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 初始化时获取在线好友
    loadOnlineFriends();

    // 监听状态变化
    const handleStatusChange = () => {
      // 状态变化时重新获取在线好友列表
      loadOnlineFriends();
    };

    // 添加状态变化监听器
    if (window.onlineStatusManager) {
      const unsubscribe = window.onlineStatusManager.addStatusChangeListener(handleStatusChange);
      
      // 定期刷新（每30秒）
      const interval = setInterval(loadOnlineFriends, 30000);
      
      return () => {
        unsubscribe();
        clearInterval(interval);
      };
    }
  }, []);

  const loadOnlineFriends = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (window.onlineStatusManager) {
        const friends = window.onlineStatusManager.getOnlineUsers();
        setOnlineFriends(friends);
      }
    } catch (err) {
      console.error('获取在线好友失败:', err);
      setError('获取在线好友失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFriendClick = (friend) => {
    if (onSelectFriend) {
      onSelectFriend(friend);
    }
  };

  const formatLoginTime = (loginTime) => {
    if (!loginTime) return '';
    
    try {
      const time = new Date(loginTime);
      return time.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return '';
    }
  };

  if (loading) {
    return (
      <div className={`online-friends-list ${className}`}>
        {showHeader && <h3>在线好友</h3>}
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          加载中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`online-friends-list ${className}`}>
        {showHeader && <h3>在线好友</h3>}
        <div style={{ padding: '20px', textAlign: 'center', color: '#f44336' }}>
          {error}
          <button 
            onClick={loadOnlineFriends}
            style={{
              marginLeft: '10px',
              padding: '4px 8px',
              background: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`online-friends-list ${className}`}>
      {showHeader && (
        <h3 style={{ 
          margin: '0 0 15px 0', 
          padding: '0 15px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          在线好友
          <span style={{ 
            fontSize: '14px', 
            fontWeight: 'normal', 
            color: '#666',
            background: '#e8f5e8',
            padding: '2px 8px',
            borderRadius: '10px'
          }}>
            {onlineFriends.length}人
          </span>
        </h3>
      )}
      
      <div 
        style={{ 
          maxHeight: maxHeight, 
          overflowY: 'auto',
          border: '1px solid #e0e0e0',
          borderRadius: '8px'
        }}
      >
        {onlineFriends.length === 0 ? (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#666',
            fontStyle: 'italic'
          }}>
            暂无在线好友
          </div>
        ) : (
          onlineFriends.map((friend, index) => (
            <div
              key={friend.email}
              onClick={() => handleFriendClick(friend)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 15px',
                borderBottom: index < onlineFriends.length - 1 ? '1px solid #f0f0f0' : 'none',
                cursor: onSelectFriend ? 'pointer' : 'default',
                transition: 'background-color 0.2s',
                backgroundColor: 'white'
              }}
              onMouseEnter={(e) => {
                if (onSelectFriend) {
                  e.target.style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'white';
              }}
            >
              {/* 头像 */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  marginRight: '12px',
                  position: 'relative'
                }}
              >
                {friend.name?.charAt(0)?.toUpperCase() || 'U'}
                {/* 在线状态指示器 */}
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px'
                }}>
                  <OnlineStatusIndicator 
                    userEmail={friend.email} 
                    size="small" 
                  />
                </div>
              </div>

              {/* 用户信息 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '14px',
                  marginBottom: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {friend.name}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <OnlineStatusIndicator 
                    userEmail={friend.email} 
                    size="small" 
                    showText={true}
                  />
                  {friend.loginTime && (
                    <span>
                      {formatLoginTime(friend.loginTime)}上线
                    </span>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              {onSelectFriend && (
                <div style={{ marginLeft: '8px' }}>
                  <button
                    style={{
                      background: '#4caf50',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFriendClick(friend);
                    }}
                  >
                    聊天
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 刷新按钮 */}
      <div style={{ 
        padding: '10px 15px', 
        textAlign: 'center',
        borderTop: '1px solid #f0f0f0'
      }}>
        <button
          onClick={loadOnlineFriends}
          style={{
            background: 'transparent',
            color: '#666',
            border: '1px solid #ddd',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          🔄 刷新
        </button>
      </div>
    </div>
  );
};

export default OnlineFriendsList;
