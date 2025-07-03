import React, { useState } from 'react';
import PhotoSelect from './PhotoSelect.jsx';
import DeleteFriendConfirm from './DeleteFriendConfirm.jsx';
import api from '../../utils/api.js';

const FriendDetail = ({ selectedFriend, onSendMessage, onAvatarChange, friendRequests, onAddFriend, onChangeSignature, onFriendDeleted, sentFriendRequests }) => {
  const [showPhotoSelect, setShowPhotoSelect] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const rightPanelStyle = {
    width: '60%',
    backgroundColor: '#ffffff', // 这是一个备用背景色，如果图片加载失败会显示
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    // --- 添加背景图片样式 ---
    backgroundImage: 'url("/background/message.png")', // <<<< 已替换为你的图片路径
    backgroundSize: 'cover',       // 使图片覆盖整个容器，可能会裁剪
    backgroundRepeat: 'no-repeat', // 防止图片重复
    backgroundPosition: 'center',  // 将图片居中显示
    // backgroundAttachment: 'fixed', // 如果你希望背景图片固定不随内容滚动
    // 如果需要，可以添加一个半透明的背景色叠加在图片上方，让文字更清晰
    // backgroundColor: 'rgba(255, 255, 255, 0.7)',
    // --- 结束背景图片样式 ---
  };

  const selectedFriendContainerStyle = {
    textAlign: 'center',
    maxWidth: '400px', // 限制好友详情内容的显示宽度
  };

  const largAvatarStyle = {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    margin: '0 auto 20px',
    overflow: 'hidden',
    cursor: selectedFriend?.isSelf ? 'pointer' : 'default',
    border: selectedFriend?.isSelf ? '3px solid #e91e63' : '3px solid #f8bbd9',
    transition: 'all 0.2s ease',
  };

  const avatarImageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const infoBoxStyle = {
    backgroundColor: '#fce4ec',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    textAlign: 'left',
  };

  const infoItemStyle = {
    marginBottom: '12px',
    fontSize: '14px',
  };

  const labelStyle = {
    fontWeight: '500',
    color: '#e91e63',
    marginRight: '8px',
  };

  const buttonContainerStyle = {
    display: 'flex',
    gap: '12px',
  };

  const buttonStyle = {
    padding: '10px 20px',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  };

  const sendMessageButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#4caf50',
    color: '#ffffff',
  };

  const deleteButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#f44336',
    color: '#ffffff',
  };

  // 添加新按钮样式
  const addFriendButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#2196f3',
    color: '#ffffff',
  };

  // 请求已发送按钮样式
  const requestSentButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#9e9e9e',
    color: '#ffffff',
    cursor: 'not-allowed'
  };



  const handleAvatarClick = () => {
    if (selectedFriend?.isSelf) {
      setShowPhotoSelect(true);
    }
  };

  const handleAvatarUpdate = (newAvatar) => {
    if (onAvatarChange) {
      onAvatarChange(newAvatar);
    }
  };

  const handleSendMessage = () => {
    if (onSendMessage) {
      onSendMessage();
    }
  };

  const handleDeleteFriend = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedFriend) return;
    setDeleteLoading(true);
    try {
      await api.handleremoveFriend(selectedFriend.id);
      setDeleteSuccess(true);
      if (onFriendDeleted) {
        onFriendDeleted(selectedFriend.id);
      }
      setTimeout(() => {
        setDeleteSuccess(false);
      }, 1500);
    } catch (e) {
      alert('删除好友失败: ' + (e.message || e));
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // 判断是否是好友 - 只有真正的好友关系才算
  const isFriend = selectedFriend?.isFriend;

  // 判断是否已发送好友请求
  const hasSentRequest = sentFriendRequests && sentFriendRequests.includes(selectedFriend?.email || selectedFriend?.id);

  // 添加发送好友请求函数
  const handleSendRequest = () => {
    if (onAddFriend) {
      onAddFriend(selectedFriend);
    }
  };

  if (!selectedFriend) {
    return (
      <div style={rightPanelStyle}>
        <div style={{ color: '#ad7a99', fontSize: '16px' }}>
          选择一个好友查看详细信息
        </div>
      </div>
    );
  }

  return (
    <div style={rightPanelStyle}>
      <div style={selectedFriendContainerStyle}>
        <div
          style={largAvatarStyle}
          onClick={handleAvatarClick}
          title={selectedFriend.isSelf ? "点击更换头像" : ""}
        >
          <img
            src={`/picture/${selectedFriend.avatar || '1.png'}`}
            alt={selectedFriend.name}
            style={avatarImageStyle}
            onError={e => { e.target.onerror = null; e.target.src = '/picture/1.png'; }}
          />
        </div>

        <div style={infoBoxStyle}>
          <div style={infoItemStyle}>
            <span style={labelStyle}>用户名:</span>
            {selectedFriend.name}
          </div>
          <div style={infoItemStyle}>
            <span style={labelStyle}>账号:</span>
            @{selectedFriend.account}
          </div>
          <div style={infoItemStyle}>
            <span style={labelStyle}>个性签名:</span>
            {selectedFriend.signature}
          </div>
          <div style={infoItemStyle}>
            <span style={labelStyle}>状态:</span>
            <span style={{ color: selectedFriend.isOnline ? '#4caf50' : '#9e9e9e' }}>
              {selectedFriend.isOnline ? '在线' : '离线'}
            </span>
          </div>
        </div>

        {/* 只有在查看自己信息时才显示更改个性签名按钮 */}
        {selectedFriend.isSelf && (
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
            <button
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: '2px solid #e91e63',
                backgroundColor: 'transparent',
                color: '#e91e63',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
              }}
              onClick={() => onChangeSignature && onChangeSignature()}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f8bbd9';
                e.target.style.borderColor = '#c2185b';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = '#e91e63';
              }}
            >
              更改个性签名
            </button>
          </div>
        )}

        {/* 只有在不是自己的时候才显示相关按钮 */}
        {!selectedFriend.isSelf && (
          <div style={buttonContainerStyle}>
            {isFriend ? (
              <>
                <button style={sendMessageButtonStyle} onClick={handleSendMessage}>
                  发消息
                </button>
                <button style={deleteButtonStyle} onClick={handleDeleteFriend}>
                  删除好友
                </button>
              </>
            ) : hasSentRequest ? (
              <button style={requestSentButtonStyle} disabled>
                请求已发送
              </button>
            ) : (
              <button style={addFriendButtonStyle} onClick={handleSendRequest}>
                添加好友
              </button>
            )}
          </div>
        )}
      </div>

      {/* 头像选择组件 */}
      <PhotoSelect
        isVisible={showPhotoSelect}
        onClose={() => setShowPhotoSelect(false)}
        currentAvatar={selectedFriend.avatar}
        onAvatarChange={handleAvatarUpdate}
      />

      {/* 删除好友确认组件 */}
      <DeleteFriendConfirm
        isVisible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        friendName={selectedFriend.name}
      />
      {/* 删除成功提示 */}
      {deleteSuccess && (
        <div style={{
          position: 'fixed',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, 0)',
          background: '#4caf50',
          color: '#fff',
          padding: '16px 32px',
          borderRadius: '12px',
          zIndex: 2000,
          fontSize: '18px',
          fontWeight: 600
        }}>
          删除好友成功
        </div>
      )}
    </div>
  );
};

export default FriendDetail;
