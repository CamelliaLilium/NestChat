/**
 * 在线状态指示器组件
 * 显示用户的在线状态（在线/离线/忙碌等）
 */
import React, { useState, useEffect } from 'react';

const OnlineStatusIndicator = ({ 
  userEmail, 
  size = 'small', 
  showText = false, 
  className = '' 
}) => {
  const [status, setStatus] = useState('offline');
  const [lastActivity, setLastActivity] = useState(null);

  useEffect(() => {
    // 初始化时获取用户状态
    if (window.onlineStatusManager && userEmail) {
      const userStatus = window.onlineStatusManager.getUserStatus(userEmail);
      setStatus(userStatus);
    }

    // 监听状态变化
    const handleStatusChange = (changeData) => {
      if (changeData.userId === userEmail) {
        setStatus(changeData.status);
        setLastActivity(changeData.userData?.lastActivity);
      }
    };

    // 添加状态变化监听器
    if (window.onlineStatusManager) {
      const unsubscribe = window.onlineStatusManager.addStatusChangeListener(handleStatusChange);
      return unsubscribe;
    }
  }, [userEmail]);

  // 根据状态返回样式和颜色
  const getStatusStyle = () => {
    const baseStyle = {
      width: size === 'small' ? '8px' : size === 'medium' ? '12px' : '16px',
      height: size === 'small' ? '8px' : size === 'medium' ? '12px' : '16px',
      borderRadius: '50%',
      display: 'inline-block',
      marginRight: showText ? '6px' : '0',
      border: '2px solid white',
      boxShadow: '0 0 3px rgba(0,0,0,0.3)'
    };

    switch (status) {
      case 'online':
        return { ...baseStyle, backgroundColor: '#4CAF50' }; // 绿色
      case 'away':
        return { ...baseStyle, backgroundColor: '#FF9800' }; // 橙色
      case 'busy':
        return { ...baseStyle, backgroundColor: '#F44336' }; // 红色
      default:
        return { ...baseStyle, backgroundColor: '#9E9E9E' }; // 灰色（离线）
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    switch (status) {
      case 'online':
        return '在线';
      case 'away':
        return '离开';
      case 'busy':
        return '忙碌';
      default:
        return '离线';
    }
  };

  // 获取最后活动时间的描述
  const getLastActivityText = () => {
    if (!lastActivity || status === 'online') return '';
    
    try {
      const lastTime = new Date(lastActivity);
      const now = new Date();
      const diffMs = now - lastTime;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return '刚刚活跃';
      if (diffMins < 60) return `${diffMins}分钟前活跃`;
      if (diffHours < 24) return `${diffHours}小时前活跃`;
      if (diffDays < 7) return `${diffDays}天前活跃`;
      return '很久前活跃';
    } catch (error) {
      return '';
    }
  };

  const title = `${getStatusText()}${lastActivity ? ' - ' + getLastActivityText() : ''}`;

  return (
    <span 
      className={`online-status-indicator ${className}`}
      title={title}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center',
        fontSize: size === 'small' ? '12px' : size === 'medium' ? '14px' : '16px'
      }}
    >
      <span style={getStatusStyle()}></span>
      {showText && (
        <span style={{ 
          color: status === 'online' ? '#4CAF50' : '#666',
          fontWeight: status === 'online' ? 'bold' : 'normal'
        }}>
          {getStatusText()}
        </span>
      )}
    </span>
  );
};

export default OnlineStatusIndicator;
