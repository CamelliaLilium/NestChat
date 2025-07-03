import React from 'react';
import FriendItem from './FriendItem.jsx';
import OnlineStatusIndicator from './OnlineStatusIndicator.jsx';

const FriendsList = ({ friends, selectedFriend, onFriendSelect, searchQuery, onSearchChange, onSearch }) => {
  const leftPanelStyle = {
    width: '40%',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #f8bbd9',
    display: 'flex',
    flexDirection: 'column',
  };

  const searchBarStyle = {
    padding: '16px',
    borderBottom: '1px solid #f8bbd9',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const searchInputStyle = {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #f8bbd9',
    borderRadius: '20px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#fce4ec',
    transition: 'border-color 0.2s ease',
  };

  const searchButtonStyle = {
    padding: '10px 18px',
    marginLeft: '8px',
    border: 'none',
    borderRadius: '20px',
    backgroundColor: '#e91e63',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  };

  const friendsListStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  };

  return (
    <div style={leftPanelStyle}>
      {/* 搜索栏 */}
      <div style={searchBarStyle}>
        <input
          style={searchInputStyle}
          type="text"
          placeholder="搜索好友..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={(e) => e.target.style.borderColor = '#e91e63'}
          onBlur={(e) => e.target.style.borderColor = '#f8bbd9'}
        />
        <button
          style={searchButtonStyle}
          onClick={() => onSearch && onSearch(searchQuery)}
        >
          搜索
        </button>
      </div>

      {/* 好友列表 */}
      <div style={friendsListStyle}>
        {friends.map((friend) => (
          <FriendItem
            key={friend.id}
            friend={friend}
            isSelected={selectedFriend?.id === friend.id}
            onSelect={onFriendSelect}
          />
        ))}
      </div>
    </div>
  );
};

localStorage.setItem('userAvatar', '1.png');

export default FriendsList;