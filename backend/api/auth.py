from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from backend.config import JWT_SECRET_KEY
from database.crud import get_user_by_id, update_user, create_user
from database.models import User
import logging

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="無效的令牌")
        
        user = await get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=401, detail="用戶不存在")
            
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="令牌已過期")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="無效的令牌")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

async def create_or_update_user(user_data: dict) -> User:
    """創建或更新用戶"""
    try:
        # 檢查用戶是否已存在
        existing_user = await get_user_by_id(user_data['id'])
        
        user_info = {
            'discord_id': user_data['id'],
            'username': user_data['username'],
            'email': user_data['email'],
            'avatar': user_data.get('avatar')
        }
        
        if existing_user:
            # 更新用戶資訊
            existing_user.username = user_info['username']
            existing_user.email = user_info['email']
            existing_user.avatar = user_info['avatar']
            updated_user = await update_user(str(existing_user.id), existing_user)
            return updated_user
        else:
            # 創建新用戶
            new_user = User(**user_info)
            created_user = await create_user(new_user)
            return created_user
            
    except Exception as e:
        logger.error(f"創建或更新用戶時出錯: {str(e)}")
        raise HTTPException(status_code=500, detail="創建或更新用戶時出錯") 