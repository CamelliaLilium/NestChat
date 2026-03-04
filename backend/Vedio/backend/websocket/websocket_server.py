import asyncio
import websockets
import json
import logging
from typing import Dict, Set
import base64
import threading
import queue
from datetime import datetime

# 导入视频通话系统模块
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'video_call_system'))

from video_capture import VideoCapture
from network_manager import NetworkManager
from crypto_manager import SimpleCrypto

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoCallSession:
    """视频通话会话管理"""
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.participants: Set[websockets.WebSocketServerProtocol] = set()
        self.video_capture = None
        self.crypto = SimpleCrypto("default_video_key_2025")
        self.is_active = False
        
    def add_participant(self, websocket):
        self.participants.add(websocket)
        logger.info(f"用户加入视频会话 {self.session_id}, 当前参与者数量: {len(self.participants)}")
        
    def remove_participant(self, websocket):
        self.participants.discard(websocket)
        logger.info(f"用户离开视频会话 {self.session_id}, 当前参与者数量: {len(self.participants)}")
        
        # 如果没有参与者了，停止视频捕获
        if len(self.participants) == 0:
            self.stop_video_capture()
            
    def start_video_capture(self, websocket):
        """启动视频捕获"""
        if self.video_capture is None:
            self.video_capture = VideoCapture()
            self.video_capture.frame_ready.connect(self.on_frame_captured)
            self.video_capture.start_capture()
            self.is_active = True
            logger.info(f"启动视频捕获 for session {self.session_id}")
            
    def stop_video_capture(self):
        """停止视频捕获"""
        if self.video_capture:
            self.video_capture.stop_capture()
            self.video_capture = None
            self.is_active = False
            logger.info(f"停止视频捕获 for session {self.session_id}")
            
    def on_frame_captured(self, compressed_data):
        """处理捕获的视频帧"""
        try:
            # 加密数据
            encrypted_data = self.crypto.encrypt_data(compressed_data)
            # Base64编码用于WebSocket传输
            encoded_data = base64.b64encode(encrypted_data).decode('utf-8')
            
            # 发送给所有参与者
            message = {
                'type': 'video_frame',
                'session_id': self.session_id,
                'data': encoded_data,
                'timestamp': datetime.now().isoformat()
            }
            
            # 异步发送给所有连接的客户端
            asyncio.create_task(self.broadcast_to_participants(message))
            
        except Exception as e:
            logger.error(f"处理视频帧错误: {e}")
            
    async def broadcast_to_participants(self, message):
        """向所有参与者广播消息"""
        if not self.participants:
            return
            
        # 创建发送任务列表
        tasks = []
        for websocket in self.participants.copy():  # 使用copy避免在迭代中修改
            if websocket.closed:
                self.participants.discard(websocket)
                continue
            tasks.append(self.send_safe(websocket, message))
            
        # 并发发送
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
            
    async def send_safe(self, websocket, message):
        """安全发送消息"""
        try:
            await websocket.send(json.dumps(message))
        except websockets.exceptions.ConnectionClosed:
            self.participants.discard(websocket)
        except Exception as e:
            logger.error(f"发送消息失败: {e}")
            self.participants.discard(websocket)

class WebSocketServer:
    """WebSocket服务器主类"""
    def __init__(self):
        self.connections: Dict[str, websockets.WebSocketServerProtocol] = {}
        self.video_sessions: Dict[str, VideoCallSession] = {}
        self.user_sessions: Dict[str, str] = {}  # user_id -> session_id
        
    async def register_connection(self, websocket, user_id: str):
        """注册WebSocket连接"""
        self.connections[user_id] = websocket
        logger.info(f"用户 {user_id} 连接到WebSocket服务器")
        
    async def unregister_connection(self, user_id: str):
        """注销WebSocket连接"""
        if user_id in self.connections:
            # 如果用户在视频会话中，移除之
            if user_id in self.user_sessions:
                session_id = self.user_sessions[user_id]
                await self.leave_video_session(user_id, session_id)
                
            del self.connections[user_id]
            logger.info(f"用户 {user_id} 断开WebSocket连接")
            
    async def create_video_session(self, caller_id: str, callee_id: str):
        """创建视频通话会话"""
        session_id = f"video_{caller_id}_{callee_id}_{int(datetime.now().timestamp())}"
        
        if session_id not in self.video_sessions:
            self.video_sessions[session_id] = VideoCallSession(session_id)
            
        # 通知被叫方有来电
        await self.send_to_user(callee_id, {
            'type': 'incoming_call',
            'session_id': session_id,
            'caller_id': caller_id,
            'caller_name': f"用户{caller_id}",  # 实际应用中从数据库获取
            'timestamp': datetime.now().isoformat()
        })
        
        return session_id
        
    async def join_video_session(self, user_id: str, session_id: str):
        """加入视频通话会话"""
        if session_id in self.video_sessions and user_id in self.connections:
            session = self.video_sessions[session_id]
            websocket = self.connections[user_id]
            
            session.add_participant(websocket)
            self.user_sessions[user_id] = session_id
            
            # 如果是第一个参与者，启动视频捕获
            if len(session.participants) == 1:
                session.start_video_capture(websocket)
                
            # 通知会话中的其他用户
            await session.broadcast_to_participants({
                'type': 'user_joined',
                'session_id': session_id,
                'user_id': user_id,
                'participant_count': len(session.participants)
            })
            
            return True
        return False
        
    async def leave_video_session(self, user_id: str, session_id: str):
        """离开视频通话会话"""
        if session_id in self.video_sessions and user_id in self.connections:
            session = self.video_sessions[session_id]
            websocket = self.connections[user_id]
            
            session.remove_participant(websocket)
            
            if user_id in self.user_sessions:
                del self.user_sessions[user_id]
                
            # 通知其他参与者
            await session.broadcast_to_participants({
                'type': 'user_left',
                'session_id': session_id,
                'user_id': user_id,
                'participant_count': len(session.participants)
            })
            
            # 如果会话没有参与者了，清理会话
            if len(session.participants) == 0:
                del self.video_sessions[session_id]
                logger.info(f"视频会话 {session_id} 已清理")
                
            return True
        return False
        
    async def send_to_user(self, user_id: str, message: dict):
        """发送消息给指定用户"""
        if user_id in self.connections:
            websocket = self.connections[user_id]
            try:
                await websocket.send(json.dumps(message))
                return True
            except websockets.exceptions.ConnectionClosed:
                await self.unregister_connection(user_id)
            except Exception as e:
                logger.error(f"发送消息给用户 {user_id} 失败: {e}")
        return False
        
    async def handle_message(self, websocket, user_id: str, message: dict):
        """处理WebSocket消息"""
        message_type = message.get('type')
        
        try:
            if message_type == 'initiate_call':
                # 发起视频通话
                callee_id = message.get('callee_id')
                session_id = await self.create_video_session(user_id, callee_id)
                
                await self.send_to_user(user_id, {
                    'type': 'call_initiated',
                    'session_id': session_id,
                    'callee_id': callee_id
                })
                
            elif message_type == 'accept_call':
                # 接受视频通话
                session_id = message.get('session_id')
                success = await self.join_video_session(user_id, session_id)
                
                await self.send_to_user(user_id, {
                    'type': 'call_accepted' if success else 'call_failed',
                    'session_id': session_id
                })
                
            elif message_type == 'reject_call':
                # 拒绝视频通话
                session_id = message.get('session_id')
                caller_id = message.get('caller_id')
                
                await self.send_to_user(caller_id, {
                    'type': 'call_rejected',
                    'session_id': session_id,
                    'rejected_by': user_id
                })
                
            elif message_type == 'hang_up':
                # 挂断通话
                session_id = message.get('session_id')
                await self.leave_video_session(user_id, session_id)
                
            elif message_type == 'ping':
                # 心跳检测
                await self.send_to_user(user_id, {'type': 'pong'})
                
            else:
                logger.warning(f"未知消息类型: {message_type}")
                
        except Exception as e:
            logger.error(f"处理消息错误: {e}")
            await self.send_to_user(user_id, {
                'type': 'error',
                'message': str(e)
            })

# 全局服务器实例
server = WebSocketServer()

async def handle_websocket(websocket, path):
    """WebSocket连接处理函数"""
    user_id = None
    try:
        # 等待客户端发送认证信息
        auth_message = await websocket.recv()
        auth_data = json.loads(auth_message)
        
        if auth_data.get('type') != 'auth':
            await websocket.send(json.dumps({'type': 'error', 'message': '需要认证'}))
            return
            
        user_id = auth_data.get('user_id')
        if not user_id:
            await websocket.send(json.dumps({'type': 'error', 'message': '无效的用户ID'}))
            return
            
        # 注册连接
        await server.register_connection(websocket, user_id)
        
        # 发送认证成功消息
        await websocket.send(json.dumps({
            'type': 'auth_success',
            'user_id': user_id,
            'timestamp': datetime.now().isoformat()
        }))
        
        # 消息循环
        async for message in websocket:
            try:
                data = json.loads(message)
                await server.handle_message(websocket, user_id, data)
            except json.JSONDecodeError:
                logger.error(f"无效的JSON消息: {message}")
            except Exception as e:
                logger.error(f"处理消息时出错: {e}")
                
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"WebSocket连接关闭: {user_id}")
    except Exception as e:
        logger.error(f"WebSocket处理错误: {e}")
    finally:
        if user_id:
            await server.unregister_connection(user_id)

def start_websocket_server(host='localhost', port=8765):
    """启动WebSocket服务器"""
    logger.info(f"启动WebSocket服务器 {host}:{port}")
    
    start_server = websockets.serve(handle_websocket, host, port)
    
    loop = asyncio.get_event_loop()
    loop.run_until_complete(start_server)
    loop.run_forever()

if __name__ == "__main__":
    start_websocket_server()
