import React, { useState } from 'react';
import OnlineStatusIndicator from './OnlineStatusIndicator.jsx';

const FriendItem = ({ friend, isSelected, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);

  const friendItemStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #fce4ec',
    transition: 'background-color 0.2s ease',
  };

  const friendItemHoverStyle = {
    backgroundColor: '#fce4ec',
  };

  const avatarStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
    flexShrink: 0,
    overflow: 'hidden',
    border: friend.isSelf ? '2px solid #e91e63' : '2px solid #f8bbd9',
    background: '#f8bbd9',
  };

  const avatarImageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const friendInfoStyle = {
    flex: 1,
    minWidth: 0,
  };

  const friendNameStyle = {
    fontSize: '15px',
    fontWeight: '500',
    color: '#212529',
    marginBottom: '2px',
  };

  const friendAccountStyle = {
    fontSize: '12px',
    color: '#ad7a99',
  };

  return (
    <div
      style={{
        ...friendItemStyle,
        ...(isHovered ? friendItemHoverStyle : {}),
        backgroundColor: isSelected ? '#fce4ec' : 'transparent',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(friend)}
    >
      <div style={{...avatarStyle, position: 'relative'}}>
        <img
          src={'/picture/' + (friend.avatar || '1.png')}
          alt={friend.name}
          style={avatarImageStyle}
          onError={e => { e.target.onerror = null; e.target.src = '/picture/1.png'; }}
        />
        {/* 在线状态指示器 */}
        <div style={{
          position: 'absolute',
          bottom: '-2px',
          right: '-2px'
        }}>
          <OnlineStatusIndicator 
            userEmail={friend.email || friend.id} 
            size="small"
          />
        </div>
      </div>
      <div style={friendInfoStyle}>
        <div style={friendNameStyle}>{friend.name}</div>
        <div style={friendAccountStyle}>@{friend.account}</div>
        {friend.email && friend.email !== friend.account && (
          <div style={friendAccountStyle}>{friend.email}</div>
        )}
      </div>
    </div>
  );
};

export default FriendItem;
