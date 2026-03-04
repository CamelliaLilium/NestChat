from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad
import hashlib

class SimpleCrypto:
    def __init__(self, password="default_key_2023"):
        # 从密码生成32字节密钥
        self.key = hashlib.sha256(password.encode()).digest()
    
    def encrypt_data(self, data):
        """加密数据"""
        cipher = AES.new(self.key, AES.MODE_CBC)
        iv = cipher.iv
        padded_data = pad(data, AES.block_size)
        encrypted_data = cipher.encrypt(padded_data)
        return iv + encrypted_data  # IV在前
    
    def decrypt_data(self, encrypted_data):
        """解密数据"""
        iv = encrypted_data[:16]  # 前16字节是IV
        encrypted_content = encrypted_data[16:]
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        decrypted_data = cipher.decrypt(encrypted_content)
        return unpad(decrypted_data, AES.block_size)