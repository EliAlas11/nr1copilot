"""
Redis Service Layer

- Provides a centralized, auditable, and testable interface for Redis operations.
- Designed for world-class auditability, reliability, and maintainability (Stripe/Netflix standards).
- All Redis access should go through this service for compliance and observability.

Compliance Note:
    All Redis operations should be logged for audit/compliance. See TODOs for logging hooks.
"""

import redis
from redis import Redis
from typing import Optional
from ..config import settings

# Singleton Redis connection (for production, consider connection pooling and health checks)
_redis_conn: Optional[Redis] = None

def get_redis_conn() -> Redis:
    """
    Get a Redis connection instance. Initializes if not already connected.

    Returns:
        Redis: Redis connection instance.

    Raises:
        ConnectionError: If Redis connection fails.
    """
    global _redis_conn
    if _redis_conn is None:
        try:
            _redis_conn = redis.Redis.from_url(settings.REDIS_URL)
            # TODO: Add health check/ping and audit logging here
        except Exception as e:
            # TODO: Add audit logging for connection errors
            raise ConnectionError(f"Failed to connect to Redis: {e}")
    return _redis_conn

# TODO: Add wrapper functions for Redis operations with audit logging and error handling
# Example:
# def set_value(key: str, value: str, ex: int = 3600) -> bool:
#     ...
# def get_value(key: str) -> Optional[str]:
#     ...
