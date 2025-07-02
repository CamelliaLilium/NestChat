import React, { useState } from 'react';

const ChangeSign = ({ isOpen, onClose, currentSignature, onSave }) => {
  const [newSignature, setNewSignature] = useState(currentSignature || '');
  const [isHovered, setIsHovered] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (newSignature.trim().length === 0) {
      alert('个性签名不能为空');
      return;
    }
    if (newSignature.length > 50) {
      alert('个性签名不能超过50个字符');
      return;
    }
    onSave(newSignature.trim());
    onClose();
  };

  const handleCancel = () => {
    setNewSignature(currentSignature || '');
    onClose();
  };

  // 样式定义
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle = {
    width: '90%',
    maxWidth: '400px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
    animation: 'slideIn 0.3s ease-out',
  };

  const titleStyle = {
    fontSize: '20px',
    fontWeight: '600',
    color: '#212529',
    marginBottom: '20px',
    textAlign: 'center',
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #f8bbd9',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '100px',
    boxSizing: 'border-box',
  };

  const inputFocusStyle = {
    borderColor: '#e91e63',
  };

  const charCountStyle = {
    textAlign: 'right',
    fontSize: '12px',
    color: newSignature.length > 50 ? '#e53e3e' : '#666',
    marginTop: '8px',
    marginBottom: '20px',
  };

  const buttonContainerStyle = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  };

  const buttonBaseStyle = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '80px',
  };

  const cancelButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
    border: '1px solid #dee2e6',
  };

  const saveButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#e91e63',
    color: '#ffffff',
    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
  };

  const saveButtonHoverStyle = {
    backgroundColor: '#c2185b',
    boxShadow: '0 4px 12px rgba(233, 30, 99, 0.3)',
  };

  return (
    <div style={overlayStyle} onClick={handleCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={titleStyle}>
          ✏️ 更改个性签名
        </div>

        <textarea
          style={inputStyle}
          value={newSignature}
          onChange={(e) => setNewSignature(e.target.value)}
          onFocus={(e) => e.target.style.borderColor = '#e91e63'}
          onBlur={(e) => e.target.style.borderColor = '#f8bbd9'}
          placeholder="请输入你的个性签名..."
          maxLength={60}
          autoFocus
        />

        <div style={charCountStyle}>
          {newSignature.length}/50
        </div>

        <div style={buttonContainerStyle}>
          <button
            style={cancelButtonStyle}
            onClick={handleCancel}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#e9ecef';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#f8f9fa';
            }}
          >
            取消
          </button>
          <button
            style={{
              ...saveButtonStyle,
              ...(isHovered ? saveButtonHoverStyle : {}),
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleSave}
            disabled={newSignature.length > 50}
          >
            保存
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ChangeSign;
