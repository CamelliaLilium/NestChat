import sys
import pickle
import zlib
from PyQt5.QtWidgets import *
from PyQt5.QtCore import *
from PyQt5.QtGui import *
import cv2

from video_capture import VideoCapture
from network_manager import NetworkManager
from crypto_manager import SimpleCrypto

class VideoCallWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.init_ui()
        self.init_components()
        self.connect_signals()
        
    def init_ui(self):
        """初始化界面"""
        self.setWindowTitle("PyQt5 加密视频通话系统")
        self.setGeometry(100, 100, 1000, 700)
        
        # 中央窗口
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QVBoxLayout(central_widget)
        
        # 视频区域
        video_layout = QHBoxLayout()
        
        # 本地视频
        self.local_video = QLabel("本地视频")
        self.local_video.setMinimumSize(400, 300)
        self.local_video.setStyleSheet("border: 2px solid blue; background-color: black;")
        self.local_video.setAlignment(Qt.AlignCenter)
        video_layout.addWidget(self.local_video)
        
        # 远程视频
        self.remote_video = QLabel("远程视频")
        self.remote_video.setMinimumSize(400, 300)
        self.remote_video.setStyleSheet("border: 2px solid red; background-color: black;")
        self.remote_video.setAlignment(Qt.AlignCenter)
        video_layout.addWidget(self.remote_video)
        
        main_layout.addLayout(video_layout)
        
        # 连接控制区域
        control_layout = QHBoxLayout()
        
        # IP输入
        control_layout.addWidget(QLabel("对方IP:"))
        self.ip_input = QLineEdit("127.0.0.1")
        control_layout.addWidget(self.ip_input)
        
        # 端口输入
        control_layout.addWidget(QLabel("端口:"))
        self.port_input = QLineEdit("12345")
        control_layout.addWidget(self.port_input)
        
        # 密码输入
        control_layout.addWidget(QLabel("加密密码:"))
        self.password_input = QLineEdit("default_key_2023")
        control_layout.addWidget(self.password_input)
        
        main_layout.addLayout(control_layout)
        
        # 按钮区域
        button_layout = QHBoxLayout()
        
        self.start_server_btn = QPushButton("启动服务器(等待连接)")
        self.connect_btn = QPushButton("连接对方")
        self.start_camera_btn = QPushButton("开启摄像头")
        self.stop_camera_btn = QPushButton("关闭摄像头")
        self.disconnect_btn = QPushButton("断开连接")
        
        button_layout.addWidget(self.start_server_btn)
        button_layout.addWidget(self.connect_btn)
        button_layout.addWidget(self.start_camera_btn)
        button_layout.addWidget(self.stop_camera_btn)
        button_layout.addWidget(self.disconnect_btn)
        
        main_layout.addLayout(button_layout)
        
        # 状态栏
        self.status_label = QLabel("就绪")
        main_layout.addWidget(self.status_label)
        
        # 设置按钮状态
        self.stop_camera_btn.setEnabled(False)
        self.disconnect_btn.setEnabled(False)
    
    def init_components(self):
        """初始化组件"""
        self.video_capture = VideoCapture()
        self.network_manager = NetworkManager()
        self.crypto = SimpleCrypto(self.password_input.text())
        
    def connect_signals(self):
        """连接信号槽"""
        # 按钮事件
        self.start_server_btn.clicked.connect(self.start_server)
        self.connect_btn.clicked.connect(self.connect_to_server)
        self.start_camera_btn.clicked.connect(self.start_camera)
        self.stop_camera_btn.clicked.connect(self.stop_camera)
        self.disconnect_btn.clicked.connect(self.disconnect)
        
        # 视频采集事件
        self.video_capture.frame_ready.connect(self.on_frame_captured)
        self.video_capture.local_frame_ready.connect(self.display_local_frame)
        
        # 网络事件
        self.network_manager.data_received.connect(self.on_data_received)
        self.network_manager.connection_status.connect(self.on_connection_status)
        
        # 密码变更事件
        self.password_input.textChanged.connect(self.update_crypto_key)
    
    def start_server(self):
        """启动服务器"""
        port = int(self.port_input.text())
        self.network_manager.start_server(port)
        
    def connect_to_server(self):
        """连接到服务器"""
        host = self.ip_input.text()
        port = int(self.port_input.text())
        self.network_manager.connect_to_server(host, port)
        
    def start_camera(self):
        """开启摄像头"""
        self.video_capture.start_capture()
        self.start_camera_btn.setEnabled(False)
        self.stop_camera_btn.setEnabled(True)
        
    def stop_camera(self):
        """关闭摄像头"""
        self.video_capture.stop_capture()
        self.start_camera_btn.setEnabled(True)
        self.stop_camera_btn.setEnabled(False)
        self.local_video.setText("本地视频")
        
    def disconnect(self):
        """断开连接"""
        self.network_manager.disconnect()
        self.disconnect_btn.setEnabled(False)
        self.start_server_btn.setEnabled(True)
        self.connect_btn.setEnabled(True)
        
    def update_crypto_key(self):
        """更新加密密钥"""
        self.crypto = SimpleCrypto(self.password_input.text())
        
    @pyqtSlot(bytes)
    def on_frame_captured(self, compressed_data):
        """处理捕获的视频帧"""
        try:
            # 加密数据
            encrypted_data = self.crypto.encrypt_data(compressed_data)
            # 发送给对方
            self.network_manager.send_data(encrypted_data)
        except Exception as e:
            print(f"发送视频帧错误: {e}")
            
    @pyqtSlot(QPixmap)
    def display_local_frame(self, pixmap):
        """显示本地视频"""
        scaled_pixmap = pixmap.scaled(self.local_video.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation)
        self.local_video.setPixmap(scaled_pixmap)
        
    @pyqtSlot(bytes)
    def on_data_received(self, encrypted_data):
        """处理接收到的数据"""
        try:
            # 解密数据
            compressed_data = self.crypto.decrypt_data(encrypted_data)
            
            # 解压缩
            frame_data = zlib.decompress(compressed_data)
            encoded_frame = pickle.loads(frame_data)
            
            # 解码图像
            frame = cv2.imdecode(encoded_frame, cv2.IMREAD_COLOR)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # 转换为Qt格式并显示
            h, w, ch = rgb_frame.shape
            qt_image = QImage(rgb_frame.data, w, h, ch * w, QImage.Format_RGB888)
            pixmap = QPixmap.fromImage(qt_image)
            scaled_pixmap = pixmap.scaled(self.remote_video.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation)
            self.remote_video.setPixmap(scaled_pixmap)
            
        except Exception as e:
            print(f"处理接收数据错误: {e}")
            
    @pyqtSlot(bool, str)
    def on_connection_status(self, connected, message):
        """处理连接状态变化"""
        self.status_label.setText(message)
        
        if connected:
            self.disconnect_btn.setEnabled(True)
            self.start_server_btn.setEnabled(False)
            self.connect_btn.setEnabled(False)
        else:
            self.disconnect_btn.setEnabled(False)
            self.start_server_btn.setEnabled(True)
            self.connect_btn.setEnabled(True)
            self.remote_video.setText("远程视频")