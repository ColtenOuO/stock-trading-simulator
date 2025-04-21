import sys
import os
from datetime import datetime, timedelta
import requests
from urllib.parse import urlencode
import jwt
import logging

# 添加 backend 目錄到 Python 路徑
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, backend_dir)

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from services.data_sources.twse import TWSEDataSource
from backend.config import (
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_REDIRECT_URI,
    DISCORD_API_ENDPOINT,
    JWT_SECRET_KEY,
    SERVER_HOST,
    SERVER_PORT,
    JWT_ACCESS_TOKEN_EXPIRES,
    JWT_ALGORITHM
)
from api.trading import router as trading_router
from database.connection import database
import uvicorn

# 設置日誌
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5500",
        "http://localhost:5501",
        "http://127.0.0.1:5001",
        "http://localhost:5001"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

@app.on_event("startup")
async def startup_db_client():
    logger.info("正在連接到資料庫...")
    await database.connect_to_mongo()
    logger.info("資料庫連接成功")

@app.on_event("shutdown")
async def shutdown_db_client():
    logger.info("正在關閉資料庫連接...")
    await database.close_mongo_connection()
    logger.info("資料庫連接已關閉")

# 註冊交易路由
app.include_router(trading_router, prefix="/api/trading", tags=["trading"])

twse = TWSEDataSource()

# Discord 登入路由
@app.get("/api/auth/discord/login")
async def discord_login():
    """
    重定向到 Discord 授權頁面
    """
    params = {
        'client_id': DISCORD_CLIENT_ID,
        'redirect_uri': DISCORD_REDIRECT_URI,
        'response_type': 'code',
        'scope': 'identify email'
    }
    
    return RedirectResponse(
        f"https://discord.com/api/oauth2/authorize?{urlencode(params)}"
    )

@app.get("/api/auth/discord/callback")
async def discord_callback(code: str):
    """
    處理 Discord 的回調
    """
    try:
        # 交換授權碼獲取訪問令牌
        token_response = requests.post(
            f"{DISCORD_API_ENDPOINT}/oauth2/token",
            data={
                'client_id': DISCORD_CLIENT_ID,
                'client_secret': DISCORD_CLIENT_SECRET,
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': DISCORD_REDIRECT_URI
            },
            headers={
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        )
        token_data = token_response.json()
        
        # 使用訪問令牌獲取用戶信息
        user_response = requests.get(
            f"{DISCORD_API_ENDPOINT}/users/@me",
            headers={
                'Authorization': f"Bearer {token_data['access_token']}"
            }
        )
        user_data = user_response.json()
        
        # 創建 JWT 令牌
        jwt_token = jwt.encode(
            {
                'user_id': user_data['id'],
                'username': user_data['username'],
                'email': user_data.get('email'),
                'avatar': user_data.get('avatar'),
                'exp': datetime.utcnow() + timedelta(hours=12),  # 縮短有效期為 12 小時
                'iat': datetime.utcnow(),  # 令牌簽發時間
                'iss': 'stock-trading-simulator',  # 簽發者
                'sub': user_data['id'],  # 主題（用戶ID）
            },
            JWT_SECRET_KEY,
            algorithm='HS256'
        )
        
        # 重定向到前端頁面，將 token 作為 URL 參數
        return RedirectResponse(
            f"http://127.0.0.1:5500/stock-trading-simulator/frontend/pages/trading/trading.html?token={jwt_token}",
            status_code=302
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/auth/verify")
async def verify_token(request: Request):
    """
    驗證 JWT 令牌
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return {"status": "error", "message": "未登入", "is_guest": True}
        
        token = auth_header.split(' ')[1]
        try:
            print("開始解碼 token...")
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
            print("token 解碼成功")
            return {"status": "success", "user_data": payload, "is_guest": False}
        except jwt.ExpiredSignatureError:
            print("token 已過期")
            return {"status": "error", "message": "登入已過期", "is_guest": True}
        except jwt.InvalidTokenError as e:
            print(f"無效的 token: {str(e)}")
            return {"status": "error", "message": "無效的登入狀態", "is_guest": True}
            
    except Exception as e:
        print(f"驗證過程發生錯誤: {str(e)}")
        import traceback
        print(f"錯誤堆疊: {traceback.format_exc()}")
        return {"status": "error", "message": "驗證過程發生錯誤", "is_guest": True}

@app.get("/api/stock/{stock_code}")
async def get_stock(stock_code: str):
    try:
        stock_data = await twse.get_stock_price(stock_code)
        if stock_data:
            return stock_data
        raise HTTPException(status_code=404, detail="無法獲取股票資訊")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stock/{stock_code}/history")
async def get_stock_history(stock_code: str, period: str = "1d"):
    try:
        today = datetime.now()
        
        if period == "1d":
            # 日內數據：使用即時數據模擬
            data = []
            base_price = 100.0  # 基準價格
            for hour in range(9, 14):  # 交易時間 9:00-13:30
                for minute in range(0, 60, 5):  # 每5分鐘一個數據點
                    if hour == 13 and minute > 30:  # 只到 13:30
                        break
                    time_str = f"{today.strftime('%Y-%m-%d')} {hour:02d}:{minute:02d}:00"
                    # 模擬價格波動
                    price = base_price * (1 + (hash(time_str) % 100 - 50) / 1000)
                    data.append({
                        "time": time_str,
                        "price": round(price, 2)
                    })
            return data
            
        elif period == "1w":
            # 一週數據
            end_date = today.strftime("%Y%m%d")
            start_date = (today - timedelta(days=7)).strftime("%Y%m%d")
        elif period == "1m":
            # 一個月數據
            end_date = today.strftime("%Y%m%d")
            start_date = (today - timedelta(days=30)).strftime("%Y%m%d")
        else:
            raise HTTPException(status_code=400, detail="無效的時間週期")

        if period in ["1w", "1m"]:
            historical_data = await twse.get_historical_data(stock_code, start_date, end_date)
            return [
                {
                    "time": item["date"].strftime("%Y-%m-%d"),
                    "price": item["close_price"]
                }
                for item in historical_data
            ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/logout")
async def logout():
    """
    處理登出請求
    """
    response = RedirectResponse(
        url="http://127.0.0.1:5500/stock-trading-simulator/frontend/pages/home/index.html",
        status_code=302
    )
    response.delete_cookie(
        key="auth_token",
        path="/",
        secure=False,
        samesite="Lax"
    )
    return response

if __name__ == "__main__":
    uvicorn.run(app, host=SERVER_HOST, port=SERVER_PORT) 