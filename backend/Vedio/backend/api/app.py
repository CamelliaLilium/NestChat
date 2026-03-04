from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import logging
from datetime import datetime, timedelta
import jwt
import hashlib
import os
from functools import wraps

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'

# 配置CORS
CORS(app, origins=['http://localhost:5173', 'http://localhost:3000'])

# Mock数据库
USERS_DB = {
    'zhang@example.com': {
        'user_id': 'user_001',
        'name': '张三',
        'email': 'zhang@example.com',
        'password_hash': hashlib.sha256('123456'.encode()).hexdigest(),
        'avatar': '2.png',
        'is_online': False,
        'last_seen': None
    },
    'li@example.com': {
        'user_id': 'user_002',
        'name': '李四',
        'email': 'li@example.com',
        'password_hash': hashlib.sha256('password'.encode()).hexdigest(),
        'avatar': '3.png',
        'is_online': False,
        'last_seen': None
    },
    'wang@example.com': {
        'user_id': 'user_003',
        'name': '王五',
        'email': 'wang@example.com',
        'password_hash': hashlib.sha256('888888'.encode()).hexdigest(),
        'avatar': '4.png',
        'is_online': False,
        'last_seen': None
    }
}

FRIENDS_DB = {
    'user_001': ['user_002', 'user_003'],
    'user_002': ['user_001', 'user_003'],
    'user_003': ['user_001', 'user_002']
}

CHAT_SESSIONS = {}
VIDEO_SESSIONS = {}

def generate_token(user_id):
    """生成JWT token"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=24),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def verify_token(token):
    """验证JWT token"""
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(f):
    """认证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': '缺少认证token'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
            
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'error': '无效的token'}), 401
            
        request.current_user_id = user_id
        return f(*args, **kwargs)
    return decorated_function

def get_user_by_email(email):
    """根据邮箱获取用户"""
    return USERS_DB.get(email)

def get_user_by_id(user_id):
    """根据用户ID获取用户"""
    for user in USERS_DB.values():
        if user['user_id'] == user_id:
            return user
    return None

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'service': 'video-chat-api'
    })

@app.route('/api/auth/login', methods=['POST'])
def login():
    """用户登录接口"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': '邮箱和密码不能为空'}), 400
            
        user = get_user_by_email(email)
        if not user:
            return jsonify({'error': '用户不存在'}), 404
            
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        if user['password_hash'] != password_hash:
            return jsonify({'error': '密码错误'}), 401
            
        # 更新用户在线状态
        user['is_online'] = True
        user['last_seen'] = datetime.now().isoformat()
        
        token = generate_token(user['user_id'])
        
        return jsonify({
            'token': token,
            'user': {
                'user_id': user['user_id'],
                'name': user['name'],
                'email': user['email'],
                'avatar': user['avatar']
            }
        })
        
    except Exception as e:
        logger.error(f"登录错误: {e}")
        return jsonify({'error': '登录失败'}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    """用户注册接口"""
    try:
        data = request.get_json()
        email = data.get('email')
        name = data.get('name', data.get('nickname'))
        password = data.get('password')
        
        if not email or not name or not password:
            return jsonify({'error': '邮箱、姓名和密码不能为空'}), 400
            
        if email in USERS_DB:
            return jsonify({'error': '邮箱已存在'}), 409
            
        # 生成新用户ID
        user_id = f"user_{len(USERS_DB) + 1:03d}"
        
        # 创建新用户
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        new_user = {
            'user_id': user_id,
            'name': name,
            'email': email,
            'password_hash': password_hash,
            'avatar': '1.png',  # 默认头像
            'is_online': True,
            'last_seen': datetime.now().isoformat()
        }
        
        USERS_DB[email] = new_user
        FRIENDS_DB[user_id] = []  # 初始化好友列表
        
        token = generate_token(user_id)
        
        return jsonify({
            'token': token,
            'user': {
                'user_id': user_id,
                'name': name,
                'email': email,
                'avatar': new_user['avatar']
            }
        }), 201
        
    except Exception as e:
        logger.error(f"注册错误: {e}")
        return jsonify({'error': '注册失败'}), 500

@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def logout():
    """用户登出接口"""
    try:
        user = get_user_by_id(request.current_user_id)
        if user:
            user['is_online'] = False
            user['last_seen'] = datetime.now().isoformat()
            
        return jsonify({'message': '登出成功'})
        
    except Exception as e:
        logger.error(f"登出错误: {e}")
        return jsonify({'error': '登出失败'}), 500

@app.route('/api/users/profile', methods=['GET'])
@require_auth
def get_profile():
    """获取用户个人信息"""
    try:
        user = get_user_by_id(request.current_user_id)
        if not user:
            return jsonify({'error': '用户不存在'}), 404
            
        return jsonify({
            'user_id': user['user_id'],
            'name': user['name'],
            'email': user['email'],
            'avatar': user['avatar'],
            'is_online': user['is_online'],
            'last_seen': user['last_seen']
        })
        
    except Exception as e:
        logger.error(f"获取个人信息错误: {e}")
        return jsonify({'error': '获取个人信息失败'}), 500

@app.route('/api/users/profile', methods=['PUT'])
@require_auth
def update_profile():
    """更新用户个人信息"""
    try:
        data = request.get_json()
        user = get_user_by_id(request.current_user_id)
        
        if not user:
            return jsonify({'error': '用户不存在'}), 404
            
        # 更新允许修改的字段
        if 'name' in data:
            user['name'] = data['name']
        if 'avatar' in data:
            user['avatar'] = data['avatar']
            
        return jsonify({
            'user_id': user['user_id'],
            'name': user['name'],
            'email': user['email'],
            'avatar': user['avatar']
        })
        
    except Exception as e:
        logger.error(f"更新个人信息错误: {e}")
        return jsonify({'error': '更新个人信息失败'}), 500

@app.route('/api/friends', methods=['GET'])
@require_auth
def get_friends():
    """获取好友列表"""
    try:
        user_id = request.current_user_id
        friend_ids = FRIENDS_DB.get(user_id, [])
        
        friends = []
        for friend_id in friend_ids:
            friend = get_user_by_id(friend_id)
            if friend:
                friends.append({
                    'user_id': friend['user_id'],
                    'name': friend['name'],
                    'avatar': friend['avatar'],
                    'is_online': friend['is_online'],
                    'last_seen': friend['last_seen']
                })
                
        return jsonify({'friends': friends})
        
    except Exception as e:
        logger.error(f"获取好友列表错误: {e}")
        return jsonify({'error': '获取好友列表失败'}), 500

@app.route('/api/friends/<friend_id>', methods=['POST'])
@require_auth
def add_friend(friend_id):
    """添加好友"""
    try:
        user_id = request.current_user_id
        
        if user_id == friend_id:
            return jsonify({'error': '不能添加自己为好友'}), 400
            
        friend = get_user_by_id(friend_id)
        if not friend:
            return jsonify({'error': '用户不存在'}), 404
            
        if user_id not in FRIENDS_DB:
            FRIENDS_DB[user_id] = []
        if friend_id not in FRIENDS_DB:
            FRIENDS_DB[friend_id] = []
            
        if friend_id not in FRIENDS_DB[user_id]:
            FRIENDS_DB[user_id].append(friend_id)
            FRIENDS_DB[friend_id].append(user_id)  # 双向好友关系
            
        return jsonify({'message': '好友添加成功'})
        
    except Exception as e:
        logger.error(f"添加好友错误: {e}")
        return jsonify({'error': '添加好友失败'}), 500

@app.route('/api/friends/<friend_id>', methods=['DELETE'])
@require_auth
def remove_friend(friend_id):
    """删除好友"""
    try:
        user_id = request.current_user_id
        
        if user_id in FRIENDS_DB and friend_id in FRIENDS_DB[user_id]:
            FRIENDS_DB[user_id].remove(friend_id)
            
        if friend_id in FRIENDS_DB and user_id in FRIENDS_DB[friend_id]:
            FRIENDS_DB[friend_id].remove(user_id)
            
        return jsonify({'message': '好友删除成功'})
        
    except Exception as e:
        logger.error(f"删除好友错误: {e}")
        return jsonify({'error': '删除好友失败'}), 500

@app.route('/api/video/sessions', methods=['POST'])
@require_auth
def create_video_session():
    """创建视频通话会话"""
    try:
        data = request.get_json()
        participant_id = data.get('participant_id')
        
        if not participant_id:
            return jsonify({'error': '缺少参与者ID'}), 400
            
        session_id = f"video_{request.current_user_id}_{participant_id}_{int(datetime.now().timestamp())}"
        
        VIDEO_SESSIONS[session_id] = {
            'session_id': session_id,
            'creator_id': request.current_user_id,
            'participant_id': participant_id,
            'status': 'created',
            'created_at': datetime.now().isoformat(),
            'started_at': None,
            'ended_at': None
        }
        
        return jsonify({
            'session_id': session_id,
            'status': 'created'
        })
        
    except Exception as e:
        logger.error(f"创建视频会话错误: {e}")
        return jsonify({'error': '创建视频会话失败'}), 500

@app.route('/api/video/sessions/<session_id>', methods=['GET'])
@require_auth
def get_video_session(session_id):
    """获取视频通话会话信息"""
    try:
        session = VIDEO_SESSIONS.get(session_id)
        if not session:
            return jsonify({'error': '会话不存在'}), 404
            
        # 检查用户是否有权限访问此会话
        user_id = request.current_user_id
        if user_id not in [session['creator_id'], session['participant_id']]:
            return jsonify({'error': '无权限访问此会话'}), 403
            
        return jsonify(session)
        
    except Exception as e:
        logger.error(f"获取视频会话错误: {e}")
        return jsonify({'error': '获取视频会话失败'}), 500

@app.route('/api/video/sessions/<session_id>/status', methods=['PUT'])
@require_auth
def update_video_session_status(session_id):
    """更新视频通话会话状态"""
    try:
        data = request.get_json()
        status = data.get('status')
        
        if not status:
            return jsonify({'error': '缺少状态信息'}), 400
            
        session = VIDEO_SESSIONS.get(session_id)
        if not session:
            return jsonify({'error': '会话不存在'}), 404
            
        # 检查用户权限
        user_id = request.current_user_id
        if user_id not in [session['creator_id'], session['participant_id']]:
            return jsonify({'error': '无权限操作此会话'}), 403
            
        session['status'] = status
        
        if status == 'started' and not session['started_at']:
            session['started_at'] = datetime.now().isoformat()
        elif status == 'ended' and not session['ended_at']:
            session['ended_at'] = datetime.now().isoformat()
            
        return jsonify(session)
        
    except Exception as e:
        logger.error(f"更新视频会话状态错误: {e}")
        return jsonify({'error': '更新视频会话状态失败'}), 500

@app.route('/api/chat/messages', methods=['GET'])
@require_auth
def get_chat_messages():
    """获取聊天消息"""
    try:
        contact_id = request.args.get('contact_id')
        if not contact_id:
            return jsonify({'error': '缺少联系人ID'}), 400
            
        # Mock聊天消息
        messages = [
            {
                'id': 1,
                'sender_id': contact_id,
                'receiver_id': request.current_user_id,
                'content': '你好！',
                'timestamp': '2025-01-01T10:00:00Z',
                'type': 'text'
            },
            {
                'id': 2,
                'sender_id': request.current_user_id,
                'receiver_id': contact_id,
                'content': '你好！很高兴认识你',
                'timestamp': '2025-01-01T10:01:00Z',
                'type': 'text'
            }
        ]
        
        return jsonify({'messages': messages})
        
    except Exception as e:
        logger.error(f"获取聊天消息错误: {e}")
        return jsonify({'error': '获取聊天消息失败'}), 500

@app.route('/api/chat/messages', methods=['POST'])
@require_auth
def send_chat_message():
    """发送聊天消息"""
    try:
        data = request.get_json()
        receiver_id = data.get('receiver_id')
        content = data.get('content')
        message_type = data.get('type', 'text')
        
        if not receiver_id or not content:
            return jsonify({'error': '缺少接收者ID或消息内容'}), 400
            
        message = {
            'id': int(datetime.now().timestamp()),
            'sender_id': request.current_user_id,
            'receiver_id': receiver_id,
            'content': content,
            'timestamp': datetime.now().isoformat(),
            'type': message_type
        }
        
        # 这里可以实现消息存储逻辑
        
        return jsonify({'message': message}), 201
        
    except Exception as e:
        logger.error(f"发送聊天消息错误: {e}")
        return jsonify({'error': '发送聊天消息失败'}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': '接口不存在'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': '服务器内部错误'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
