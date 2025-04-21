from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGODB_URI, MONGODB_DB_NAME, MONGODB_USERNAME, MONGODB_PASSWORD

class Database:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    async def connect_to_mongo(cls):
        if MONGODB_USERNAME and MONGODB_PASSWORD:
            cls.client = AsyncIOMotorClient(
                MONGODB_URI,
                username=MONGODB_USERNAME,
                password=MONGODB_PASSWORD
            )
        else:
            cls.client = AsyncIOMotorClient(MONGODB_URI)
        cls.db = cls.client[MONGODB_DB_NAME]

    @classmethod
    async def close_mongo_connection(cls):
        cls.client.close()

    @classmethod
    def get_collection(cls, collection_name: str):
        return cls.db[collection_name]

# 創建資料庫實例
database = Database() 