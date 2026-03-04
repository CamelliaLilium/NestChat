import socket
import threading
import struct
from PyQt5.QtCore import QObject, pyqtSignal

class NetworkManager(QObject):
    data_received = pyqtSignal(bytes)
    connection_status = pyqtSignal(bool, str)
    
    def __init__(self):
        super().__init__()
        self.socket = None
        self.is_server = False
        self.is_connected = False
        self.client_socket = None
        
    def start_server(self, port=12345):
        """启动服务器模式"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.socket.bind(('0.0.0.0', port))
            self.socket.listen(1)
            self.is_server = True
            
            # 等待连接的线程
            threading.Thread(target=self._accept_connection, daemon=True).start()
            self.connection_status.emit(True, f"服务器启动，等待连接... 端口:{port}")
            
        except Exception as e:
            self.connection_status.emit(False, f"服务器启动失败: {e}")
    
    def connect_to_server(self, host, port=12345):
        """连接到服务器"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((host, port))
            self.is_connected = True
            
            # 接收数据的线程
            threading.Thread(target=self._receive_data, daemon=True).start()
            self.connection_status.emit(True, f"已连接到 {host}:{port}")
            
        except Exception as e:
            self.connection_status.emit(False, f"连接失败: {e}")
    
    def _accept_connection(self):
        """等待客户端连接"""
        try:
            self.client_socket, addr = self.socket.accept()
            self.is_connected = True
            self.connection_status.emit(True, f"客户端已连接: {addr[0]}")
            
            # 接收数据的线程
            threading.Thread(target=self._receive_data, daemon=True).start()
            
        except Exception as e:
            self.connection_status.emit(False, f"接受连接失败: {e}")
    
    def _receive_data(self):
        """接收数据线程"""
        target_socket = self.client_socket if self.is_server else self.socket
        
        while self.is_connected and target_socket:
            try:
                # 接收数据长度（4字节）
                length_data = self._recv_all(target_socket, 4)
                if not length_data:
                    break
                    
                data_length = struct.unpack('!I', length_data)[0]
                
                # 接收实际数据
                data = self._recv_all(target_socket, data_length)
                if data:
                    self.data_received.emit(data)
                    
            except Exception as e:
                print(f"接收数据错误: {e}")
                break
                
        self.is_connected = False
        self.connection_status.emit(False, "连接已断开")
    
    def _recv_all(self, sock, length):
        """接收指定长度的数据"""
        data = b''
        while len(data) < length:
            packet = sock.recv(length - len(data))
            if not packet:
                return None
            data += packet
        return data
    
    def send_data(self, data):
        """发送数据"""
        if not self.is_connected:
            return False
            
        try:
            target_socket = self.client_socket if self.is_server else self.socket
            if target_socket:
                # 先发送数据长度，再发送数据
                length_header = struct.pack('!I', len(data))
                target_socket.send(length_header + data)
                return True
        except Exception as e:
            print(f"发送数据错误: {e}")
            return False
    
    def disconnect(self):
        """断开连接"""
        self.is_connected = False
        if self.socket:
            self.socket.close()
        if self.client_socket:
            self.client_socket.close()