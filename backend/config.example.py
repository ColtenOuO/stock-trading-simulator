import secrets

# Discord OAuth2 配置
DISCORD_CLIENT_ID = "YOUR_DISCORD_CLIENT_ID"  # 從 Discord 開發者平台獲取
DISCORD_CLIENT_SECRET = "YOUR_DISCORD_CLIENT_SECRET"  # 從 Discord 開發者平台獲取
DISCORD_REDIRECT_URI = "http://localhost:5001/api/auth/discord/callback"
DISCORD_API_ENDPOINT = "https://discord.com/api/v10"

# JWT 配置
JWT_SECRET = secrets.token_urlsafe(32)  # 自動生成的 JWT 密鑰

# 伺服器配置
SERVER_HOST = "0.0.0.0"
SERVER_PORT = 5001

# MongoDB 配置
MONGODB_URI = ""
MONGODB_DB_NAME = ""
MONGODB_USERNAME = None  # 如果不需要認證，設為 None
MONGODB_PASSWORD = None  # 如果不需要認證，設為 None

"""
使用說明：
1. 將此文件複製為 config.py
2. 在 Discord 開發者平台 (https://discord.com/developers/applications) 創建應用
3. 從應用程式設置中獲取 Client ID 和 Client Secret
4. 在 OAuth2 設置中添加重定向 URI: http://localhost:5001/api/auth/discord/callback
5. 將獲取的 Client ID 和 Client Secret 填入對應位置
""" 