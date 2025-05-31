import redis
from ..config import settings

redis_conn = redis.Redis.from_url(settings.REDIS_URL)
