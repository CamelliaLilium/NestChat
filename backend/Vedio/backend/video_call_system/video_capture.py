import cv2
import pickle
import zlib
from PyQt5.QtCore import QThread, pyqtSignal
from PyQt5.QtGui import QImage, QPixmap

class VideoCapture(QThread):
    frame_ready = pyqtSignal(bytes)  # 发送压缩后的帧数据
    local_frame_ready = pyqtSignal(QPixmap)  # 本地预览
    
    def __init__(self):
        super().__init__()
        self.camera = None
        self.is_running = False
        
    def start_capture(self, camera_index=0):
        """开始视频采集"""
        self.camera = cv2.VideoCapture(camera_index)
        self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.camera.set(cv2.CAP_PROP_FPS, 15)  # 降低帧率减少数据量
        self.is_running = True
        self.start()
    
    def stop_capture(self):
        """停止视频采集"""
        self.is_running = False
        if self.camera:
            self.camera.release()
    
    def run(self):
        """线程主循环"""
        while self.is_running and self.camera:
            ret, frame = self.camera.read()
            if ret:
                # 缩放帧减少数据量
                frame = cv2.resize(frame, (320, 240))
                
                # 编码为JPEG格式
                _, encoded_frame = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 50])
                
                # 序列化和压缩
                frame_data = pickle.dumps(encoded_frame)
                compressed_data = zlib.compress(frame_data, level=1)
                
                # 发送给网络模块
                self.frame_ready.emit(compressed_data)
                
                # 本地预览
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                h, w, ch = rgb_frame.shape
                qt_image = QImage(rgb_frame.data, w, h, ch * w, QImage.Format_RGB888)
                pixmap = QPixmap.fromImage(qt_image)
                self.local_frame_ready.emit(pixmap)
            
            self.msleep(66)  # 约15fps