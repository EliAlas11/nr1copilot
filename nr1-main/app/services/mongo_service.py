from motor.motor_asyncio import AsyncIOMotorClient
from ..config import settings

mongo_client = AsyncIOMotorClient(settings.MONGODB_URI)
db = mongo_client.get_default_database()
