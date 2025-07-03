#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
独立的验证码邮件发送脚本
供Node.js后端调用
"""

import sys
import json
import smtplib
import random
import base64
from email.mime.text import MIMEText
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
import os

def send_verification_email(email: str, vericode: str) -> bool:
    """发送验证码邮件（纯渐变背景，无logo.png）"""

    mail_html = f"""\
<html>
  <body style="margin:0;padding:0;min-height:100vh;position:relative;overflow:hidden;
    background:linear-gradient(135deg,#f7f6ec 0%,#e3e9f3 100%);
    ">
    <div style="position:fixed;inset:0;z-index:0;pointer-events:none;
      background:rgba(255,255,255,0.15);">
      <!-- 半透明遮罩，保证内容清晰 -->
    </div>
    <div style="max-width:420px;margin:48px auto 32px auto;padding:32px 28px 28px 28px;
      background:rgba(255,255,255,0.92);border-radius:18px;box-shadow:0 6px 32px rgba(120,120,120,0.10);
      font-family:'Segoe UI',微软雅黑,Arial,sans-serif;position:relative;z-index:1;">
      <h2 style="margin-top:0;color:#4a5a7a;text-align:center;letter-spacing:2px;font-weight:600;
        text-shadow:0 2px 8px #e3e9f3;">NestChat 验证码</h2>
      <p style="font-size:15px;color:#4a5a7a;text-align:center;margin-bottom:32px;">
        欢迎来到 NestChat！<br>您的邮箱验证码为：
      </p>
      <div style="text-align:center;margin:32px 0;">
        <span style="display:inline-block;background:#f7f6ec;color:#3b6ca8;font-size:32px;
          letter-spacing:8px;font-weight:bold;padding:16px 36px;border-radius:12px;
          border:2px dashed #b3c6ff;box-shadow:0 2px 8px #e3e9f3;">
          {vericode}
        </span>
      </div>
      <p style="font-size:14px;color:#6b7a99;text-align:center;">
        验证码包含数字与大写英文字母，输入时请注意字母大小写。<br>
        验证码5分钟内有效，请勿泄露给他人。
      </p>
      <div style="margin-top:32px;text-align:center;color:#b0b0b0;font-size:12px;">
        本邮件由系统自动发送，请勿回复。
      </div>
    </div>
  </body>
</html>
"""

    # 构建邮件
    msg_root = MIMEMultipart('alternative')
    msg_root['From'] = 'Server <202695135@qq.com>'
    msg_root['To'] = f'<{email}>'
    msg_root['Subject'] = Header("验证码", 'utf-8')

    from email.mime.text import MIMEText as MT
    msg_root.attach(MT(mail_html, 'html', 'utf-8'))

    try:
        server = smtplib.SMTP_SSL('smtp.qq.com')
        server.login('202695135@qq.com', 'apfimosnwxpfbidg')
        server.sendmail('202695135@qq.com', [email], msg_root.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"邮件发送失败: {e}", file=sys.stderr)
        return False

def main():
    """主函数，从命令行参数读取邮箱和验证码"""
    if len(sys.argv) != 3:
        print(json.dumps({"success": False, "error": "参数错误"}))
        sys.exit(1)
    
    email = sys.argv[1]
    vericode = sys.argv[2]
    
    # 验证邮箱格式
    import re
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    if not re.match(email_regex, email):
        print(json.dumps({"success": False, "error": "邮箱格式不正确"}))
        sys.exit(1)
    
    # 发送邮件
    success = send_verification_email(email, vericode)
    
    if success:
        print(json.dumps({"success": True, "message": "验证码邮件发送成功"}))
    else:
        print(json.dumps({"success": False, "error": "邮件发送失败"}))

if __name__ == "__main__":
    main()
