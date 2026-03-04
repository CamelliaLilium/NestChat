#!/usr/bin/env python3
"""
WebSocket服务器启动脚本
"""
import os
import sys
sys.path.append(os.path.dirname(__file__))

from websocket.server import start_websocket_server

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='启动WebSocket服务器')
    parser.add_argument('--host', default='localhost', help='服务器主机地址')
    parser.add_argument('--port', type=int, default=8765, help='服务器端口')
    
    args = parser.parse_args()
    
    print(f"启动WebSocket服务器 {args.host}:{args.port}")
    start_websocket_server(args.host, args.port)