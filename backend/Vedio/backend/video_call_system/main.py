import sys
from PyQt5.QtWidgets import QApplication
from video_call_ui import VideoCallWindow

def main():
    app = QApplication(sys.argv)
    
    # 设置应用信息
    app.setApplicationName("PyQt5加密视频通话")
    app.setApplicationVersion("1.0")
    
    # 创建主窗口
    window = VideoCallWindow()
    window.show()
    
    # 运行应用
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()