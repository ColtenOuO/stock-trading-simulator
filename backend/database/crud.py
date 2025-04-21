from typing import List, Optional
from bson import ObjectId
from .models import User, Stock, Transaction, Portfolio, Watchlist
from .connection import database

# User CRUD
async def create_user(user: User) -> User:
    user_dict = user.dict(by_alias=True)
    result = await database.get_collection("users").insert_one(user_dict)
    user_dict["_id"] = result.inserted_id
    return User(**user_dict)

async def get_user_by_id(user_id: str) -> Optional[User]:
    # 先嘗試使用 discord_id 查找
    user = await database.get_collection("users").find_one({"discord_id": user_id})
    print(user_id)
    if user:
        return User(**user)
    
    # 如果找不到，再嘗試使用 _id 查找
    try:
        user = await database.get_collection("users").find_one({"_id": ObjectId(user_id)})
        return User(**user) if user else None
    except:
        return None

async def get_user_by_email(email: str) -> Optional[User]:
    user = await database.get_collection("users").find_one({"email": email})
    return User(**user) if user else None

async def update_user(user_id: str, user: User) -> Optional[User]:
    user_dict = user.dict(by_alias=True, exclude={"id"})
    result = await database.get_collection("users").update_one(
        {"_id": ObjectId(user_id)},
        {"$set": user_dict}
    )
    if result.modified_count:
        return await get_user_by_id(user_id)
    return None

# Stock CRUD
async def create_stock(stock: Stock) -> Stock:
    stock_dict = stock.dict(by_alias=True, exclude={"id"})
    result = await database.get_collection("stocks").insert_one(stock_dict)
    stock_dict["_id"] = result.inserted_id
    return Stock(**stock_dict)

async def get_stock_by_id(stock_id: str) -> Optional[Stock]:
    stock = await database.get_collection("stocks").find_one({"_id": ObjectId(stock_id)})
    return Stock(**stock) if stock else None

async def get_stock_by_symbol(symbol: str) -> Optional[Stock]:
    stock = await database.get_collection("stocks").find_one({"symbol": symbol})
    return Stock(**stock) if stock else None

async def update_stock(stock_id: str, stock: Stock) -> Optional[Stock]:
    stock_dict = stock.dict(by_alias=True, exclude={"id"})
    result = await database.get_collection("stocks").update_one(
        {"_id": ObjectId(stock_id)},
        {"$set": stock_dict}
    )
    if result.modified_count:
        return await get_stock_by_id(stock_id)
    return None

# Transaction CRUD
async def create_transaction(transaction: Transaction) -> Transaction:
    try:
        # 先檢查是否已存在該用戶的交易記錄
        existing_transaction = await database.get_collection("transactions").find_one({"user_id": transaction.user_id})
        
        if existing_transaction:
            history_list = existing_transaction.get("history", [])
            new_history = [h.dict() for h in transaction.history]
            history_list.extend(new_history)
            
            # 更新資料庫
            await database.get_collection("transactions").update_one(
                {"user_id": transaction.user_id},
                {"$set": {"history": history_list}}
            )
        else:
            # 如果不存在，創建新的交易記錄
            transaction_dict = transaction.dict()
            transaction_dict["history"] = [h.dict() for h in transaction.history]
            await database.get_collection("transactions").insert_one(transaction_dict)
        
        return transaction
    except Exception as e:
        print(f"Error creating transaction: {e}")
        return None

async def get_user_transactions(user_id: str) -> Transaction:
    try:
        # 使用 user_id 查找交易記錄
        transaction = await database.get_collection("transactions").find_one({"user_id": int(user_id)})
        
        if transaction:
            # 如果找到交易記錄，返回 Transaction 物件
            return Transaction(**transaction)
        else:
            # 如果沒有找到，返回空列表
            return []
    except Exception as e:
        print(f"Error getting user transactions: {e}")
        return []

# Portfolio CRUD
async def create_portfolio(portfolio: Portfolio) -> Portfolio:
    portfolio_dict = portfolio.dict(by_alias=True, exclude={"id"})
    result = await database.get_collection("portfolios").insert_one(portfolio_dict)
    portfolio_dict["_id"] = result.inserted_id
    return Portfolio(**portfolio_dict)

async def get_user_portfolio(user_id: str) -> List[Portfolio]:
    print(user_id)
    portfolios = await database.get_collection("portfolios").find(
        {"user_id": user_id}
    ).to_list(length=None)
    return [Portfolio(**portfolio) for portfolio in portfolios]

async def update_portfolio(portfolio_id: str, portfolio: Portfolio) -> Optional[Portfolio]:
    portfolio_dict = portfolio.dict(by_alias=True, exclude={"id"})
    result = await database.get_collection("portfolios").update_one(
        {"_id": ObjectId(portfolio_id)},
        {"$set": portfolio_dict}
    )
    if result.modified_count:
        return await get_portfolio_by_id(portfolio_id)
    return None

async def get_portfolio_by_id(portfolio_id: str) -> Optional[Portfolio]:
    portfolio = await database.get_collection("portfolios").find_one({"_id": ObjectId(portfolio_id)})
    return Portfolio(**portfolio) if portfolio else None

async def delete_portfolio(portfolio_id: str) -> bool:
    result = await database.get_collection("portfolios").delete_one({"_id": ObjectId(portfolio_id)})
    return result.deleted_count > 0

# Watchlist CRUD
async def create_watchlist(watchlist: Watchlist) -> Watchlist:
    watchlist_dict = watchlist.dict(by_alias=True, exclude={"id"})
    result = await database.get_collection("watchlists").insert_one(watchlist_dict)
    watchlist_dict["_id"] = result.inserted_id
    return Watchlist(**watchlist_dict)

async def get_user_watchlist(user_id: str) -> Optional[Watchlist]:
    watchlist = await database.get_collection("watchlists").find_one(
        {"user_id": ObjectId(user_id)}
    )
    return Watchlist(**watchlist) if watchlist else None

async def update_watchlist(watchlist_id: str, watchlist: Watchlist) -> Optional[Watchlist]:
    watchlist_dict = watchlist.dict(by_alias=True, exclude={"id"})
    result = await database.get_collection("watchlists").update_one(
        {"_id": ObjectId(watchlist_id)},
        {"$set": watchlist_dict}
    )
    if result.modified_count:
        return await get_watchlist_by_id(watchlist_id)
    return None

async def get_watchlist_by_id(watchlist_id: str) -> Optional[Watchlist]:
    watchlist = await database.get_collection("watchlists").find_one({"_id": ObjectId(watchlist_id)})
    return Watchlist(**watchlist) if watchlist else None 