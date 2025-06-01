"""
MongoDB Service Layer

- Handles MongoDB client and database connection logic.
- Designed for auditability, security, and testability (Stripe/Netflix standards).
- TODO: Add connection health checks, error handling, and dependency injection for production.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from ..config import settings

mongo_client: AsyncIOMotorClient = AsyncIOMotorClient(settings.MONGODB_URI)
db = mongo_client.get_default_database()
