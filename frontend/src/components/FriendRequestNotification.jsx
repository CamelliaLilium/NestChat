// FriendRequestNotification.jsx
import React from 'react';
import { getAvatarForUser } from '../utils/avatarUtils.js';

const FriendRequestNotification = ({ requests, onAccept, onReject }) => {
  if (!requests.length) return null;
  
  const handleAccept = async (request) => {
    try {
      await onAccept(request);
      // 注意：状态管理在父组件中，这里不需要额外操作
    } catch (error) {
      console.error('接受好友请求失败:', error);
    }
  };

  const handleReject = async (request) => {
    try {
      await onReject(request);
      // 注意：状态管理在父组件中，这里不需要额外操作
    } catch (error) {
      console.error('拒绝好友请求失败:', error);
    }
  };
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      padding: '16px',
      width: '300px'
    }}>
      <h4>好友请求</h4>
      {requests.map(request => {
        const userEmail = request.from?.email || request.from?.account || '';
        const avatar = getAvatarForUser(userEmail);
        
        return (
          <div key={request.id} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 0',
            borderBottom: '1px solid #eee'
          }}>
            <img 
              src={`/picture/${avatar}`} 
              alt={request.from?.name || '用户'}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                marginRight: '12px',
                objectFit: 'cover'
              }}
            />
            <div style={{flex: 1}}>
              <div style={{fontWeight: '500'}}>{request.from?.name || request.from?.username || '未知用户'}</div>
              <div style={{fontSize: '12px', color: '#666'}}>@{userEmail}</div>
            </div>
            <button 
              onClick={() => handleAccept(request)}
              style={{
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                marginRight: '8px',
                cursor: 'pointer'
              }}
            >
              接受
            </button>
            <button 
              onClick={() => handleReject(request)}
              style={{
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                cursor: 'pointer'
              }}
            >
              拒绝
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default FriendRequestNotification;