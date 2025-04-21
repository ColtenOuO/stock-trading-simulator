from datetime import datetime
from typing import Optional, Annotated, Any
from pydantic import BaseModel, Field, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema
from bson import ObjectId

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return str(v)
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)

    @classmethod
    def __get_pydantic_json_schema__(
        cls,
        _schema_generator: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        return {"type": "string"}

    @classmethod
    def __get_pydantic_core_schema__(
        cls,
        _source_type: Any,
        _handler: GetJsonSchemaHandler,
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.str_schema(),
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x) if isinstance(x, ObjectId) else x
            ),
        )

class User(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    discord_id: str
    username: str
    email: str
    avatar_url: Optional[str] = None
    balance: float = Field(default=100000000.0)  # 預設 100 萬
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str
        }

class Stock(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    symbol: str
    name: str
    current_price: float
    price_change: float
    price_change_percent: float
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class Transaction(BaseModel):    
    class History(BaseModel):
        stock_id: int
        type: str  # "buy" 或 "sell"
        quantity: int
        price: float
        total_amount: float
        timestamp: datetime = Field(default_factory=datetime.utcnow)

    user_id: int #discord id
    history: list[History] = Field(default_factory=list)

class Portfolio(BaseModel):
    class StockList(BaseModel):
        stock_id: int
        quantity: int
        current_price: float
    user_id: int #discord id
    stock_list: list[StockList] = Field(default_factory=list)
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class Watchlist(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: PyObjectId
    stock_ids: list[PyObjectId] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow) 