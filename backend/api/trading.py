from fastapi import APIRouter, HTTPException, Query
from typing import List
from datetime import datetime
from database.models import Transaction, Portfolio, Stock, User
from database.crud import (
    get_user_by_id,
    get_stock_by_symbol,
    create_transaction,
    update_portfolio,
    get_user_portfolio,
    get_user_transactions,
    create_portfolio,
    update_user,
    create_stock,
    create_user
)
import jwt
from backend.config import JWT_SECRET_KEY
from bson import ObjectId
import logging
from services.data_sources.twse import TWSEDataSource

# 設置日誌
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter()
twse = TWSEDataSource()

async def verify_and_get_user(token: str) -> User:
    """驗證 token 並獲取用戶資訊，如果用戶不存在則創建"""
    try:
        # 解析 token
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="無效的令牌")
        
        # 獲取用戶資訊
        user = await get_user_by_id(user_id)
        
        # 如果用戶不存在，創建新用戶
        if not user:
            logger.info(f"用戶 {user_id} 不存在，創建新用戶")
            new_user = User(
                discord_id=user_id,
                username=payload.get('username', '新用戶'),
                email=payload.get('email', ''),
                avatar_url=f"https://cdn.discordapp.com/avatars/{user_id}/{payload.get('avatar')}.png" if payload.get('avatar') else None,
                balance=1000000000.0 
            )
            user = await create_user(new_user)
            logger.info(f"創建用戶成功: {user}")
            
            
        return user
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="令牌已過期")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="無效的令牌")
    except Exception as e:
        logger.error(f"驗證用戶時出錯: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/buy")
async def buy_stock(
    symbol: str = Query(..., description="股票代碼"),
    quantity: int = Query(..., description="購買數量", gt=0),
    token: str = Query(..., description="用戶 token")
):
    try:
        # 驗證用戶
        current_user = await verify_and_get_user(token)
        logger.debug(f"開始處理買入請求: symbol={symbol}, quantity={quantity}")
        logger.debug(f"當前用戶: id={current_user.discord_id}, balance={current_user.balance}")

        # 先從 TWSE 獲取最新股票資料
        stock_data = await twse.get_stock_price(symbol)
        if not stock_data:
            raise HTTPException(status_code=404, detail="無法獲取股票資訊")

        # 計算交易總額
        total_amount = stock_data['current_price'] * quantity
        logger.debug(f"交易總額: {total_amount}")
            
        # 檢查用戶餘額
        if current_user.balance < total_amount:
            raise HTTPException(status_code=400, detail="餘額不足")
            
        try:
            # 創建交易記錄
            transaction = Transaction(
                user_id=current_user.discord_id,
                stock_id=stock_data['symbol'],
                type="buy",
                quantity=quantity,
                price=stock_data['current_price'],
                total_amount=total_amount,
                history=[
                    {
                        "stock_id": stock_data['symbol'],
                        "type": "buy",
                        "quantity": quantity,
                        "price": stock_data['current_price'],
                        "total_amount": total_amount,
                        "timestamp": datetime.utcnow()
                    }
                ]
            )
            logger.debug(f"準備創建交易記錄: {transaction.dict()}")
            transaction = await create_transaction(transaction)
            logger.debug(f"交易記錄創建成功: {transaction}")
        except Exception as e:
            logger.error(f"創建交易記錄時出錯: {str(e)}")
            raise
        
        try:
            # 檢查是否已有持倉
            portfolio = await get_user_portfolio(current_user.discord_id)
            portfolio_list = portfolio.stock_list
            logger.debug(f"獲取到的持倉列表: {portfolio_list}")
            
            existing_stock = None
            for data in portfolio_list:
                if data.stock_id == stock_data['symbol']:
                    existing_stock = data
                    break
            
            logger.debug(f"現有持倉: {existing_stock}")
            
            if existing_stock:
                # 更新現有持倉
                existing_stock.quantity += quantity
                existing_stock.current_price = stock_data['current_price']
            else:
                # 添加新持倉
                portfolio_list.append(Portfolio.StockList(
                    stock_id=stock_data['symbol'],
                    quantity=quantity,
                    current_price=stock_data['current_price']
                ))
            
            # 更新投資組合
            updated_portfolio = Portfolio(
                user_id=current_user.discord_id,
                stock_list=portfolio_list
            )
            logger.debug(f"準備更新持倉: {updated_portfolio.dict()}")
            await update_portfolio(current_user.discord_id, updated_portfolio)
        except Exception as e:
            logger.error(f"處理持倉時出錯: {str(e)}")
            raise
        
        try:
            # 更新用戶餘額
            current_user.balance -= total_amount
            logger.debug(f"準備更新用戶餘額: {current_user.balance}")
            await update_user(str(current_user.id), current_user)
        except Exception as e:
            logger.error(f"更新用戶餘額時出錯: {str(e)}")
            raise
        
        return {"message": "購買成功", "transaction": transaction}
        
    except Exception as e:
        logger.error(f"買入處理過程中出錯: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sell")
async def sell_stock(
    symbol: str = Query(..., description="股票代碼"),
    quantity: int = Query(..., description="賣出數量", gt=0),
    token: str = Query(..., description="用戶 token")
):
    try:
        # 驗證用戶
        current_user = await verify_and_get_user(token)
        logger.debug(f"開始處理賣出請求: symbol={symbol}, quantity={quantity}")
        logger.debug(f"當前用戶: id={current_user.discord_id}, balance={current_user.balance}")

        # 先從 TWSE 獲取最新股票資料
        stock_data = await twse.get_stock_price(symbol)
        if not stock_data:
            raise HTTPException(status_code=404, detail="無法獲取股票資訊")

        # 計算交易總額
        total_amount = stock_data['current_price'] * quantity
        logger.debug(f"交易總額: {total_amount}")
            
        try:
            # 檢查是否已有持倉
            portfolio = await get_user_portfolio(current_user.discord_id)
            portfolio_list = portfolio.stock_list
            logger.debug(f"獲取到的持倉列表: {portfolio_list}")
            
            existing_stock = None
            for data in portfolio_list:
                if data.stock_id == stock_data['symbol']:
                    existing_stock = data
                    break
            
            logger.debug(f"現有持倉: {existing_stock}")
            
            if not existing_stock or existing_stock.quantity < quantity:
                raise HTTPException(status_code=400, detail="持倉不足")
            
            # 更新持倉
            existing_stock.quantity -= quantity
            existing_stock.current_price = stock_data['current_price']
            
            # 如果數量為 0，從列表中移除
            if existing_stock.quantity <= 0:
                portfolio_list = [stock for stock in portfolio_list if stock.stock_id != stock_data['symbol']]
            
            # 更新投資組合
            updated_portfolio = Portfolio(
                user_id=current_user.discord_id,
                stock_list=portfolio_list
            )
            logger.debug(f"準備更新持倉: {updated_portfolio.dict()}")
            await update_portfolio(current_user.discord_id, updated_portfolio)
        except Exception as e:
            logger.error(f"處理持倉時出錯: {str(e)}")
            raise
        
        try:
            # 創建交易記錄
            transaction = Transaction(
                user_id=current_user.discord_id,
                stock_id=stock_data['symbol'],
                type="sell",
                quantity=quantity,
                price=stock_data['current_price'],
                total_amount=total_amount,
                history=[
                    {
                        "stock_id": stock_data['symbol'],
                        "type": "sell",
                        "quantity": quantity,
                        "price": stock_data['current_price'],
                        "total_amount": total_amount,
                        "timestamp": datetime.utcnow()
                    }
                ]
            )
            logger.debug(f"準備創建交易記錄: {transaction.dict()}")
            transaction = await create_transaction(transaction)
            logger.debug(f"交易記錄創建成功: {transaction}")
        except Exception as e:
            logger.error(f"創建交易記錄時出錯: {str(e)}")
            raise
        
        try:
            # 更新用戶餘額
            current_user.balance += total_amount
            logger.debug(f"準備更新用戶餘額: {current_user.balance}")
            await update_user(str(current_user.id), current_user)
        except Exception as e:
            logger.error(f"更新用戶餘額時出錯: {str(e)}")
            raise
        
        return {"message": "賣出成功", "transaction": transaction}
        
    except Exception as e:
        logger.error(f"賣出處理過程中出錯: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions")
async def get_transactions(token: str = Query(..., description="用戶 token")):
    try:
        # 驗證用戶
        current_user = await verify_and_get_user(token)
        transactions = await get_user_transactions(current_user.discord_id)
        return {"transactions": transactions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/portfolio")
async def get_portfolio(token: str = Query(..., description="用戶 token")):
    try:
        # 驗證用戶
        current_user = await verify_and_get_user(token)
        portfolio = await get_user_portfolio(str(current_user.id))
        return {"portfolio": portfolio}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 