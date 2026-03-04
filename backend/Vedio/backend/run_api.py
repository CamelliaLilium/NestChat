#!/usr/bin/env python3
"""
API服务器启动脚本
"""
import os
import sys
sys.path.append(os.path.dirname(__file__))

from api.app import app

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='启动API服务器')
    parser.add_argument('--host', default='0.0.0.0', help='服务器主机地址')
    parser.add_argument('--port', type=int, default=5000, help='服务器端口')
    parser.add_argument('--debug', action='store_true', help='启用调试模式')
    
    args = parser.parse_args()
    
    print(f"启动API服务器 {args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=args.debug)