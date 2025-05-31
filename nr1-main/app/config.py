import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import logging
import json

load_dotenv()

def parse_cors_origins(value: str) -> List[str]:
    # If the value is empty or None, allow all origins
    if not value or value.strip() == "":
        return ["*"]
    value = value.strip()
    # Try to parse as JSON array (Render.com sometimes sets env as '["*"]')
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(v).strip() for v in parsed if str(v).strip()]
    except Exception:
        pass
    # Fallback: comma-separated string
    return [v.strip() for v in value.split(",") if v.strip()]

class Settings(BaseSettings):
    ENV: str = Field(default=os.getenv("ENV", "production"))
    PORT: int = Field(default=int(os.getenv("PORT", 5000)))
    MONGODB_URI: str = Field(default=os.getenv("MONGODB_URI", ""))
    REDIS_URL: str = Field(default=os.getenv("REDIS_URL", ""))
    JWT_SECRET: str = Field(default=os.getenv("JWT_SECRET", ""))
    AWS_S3_BUCKET: str = Field(default=os.getenv("AWS_S3_BUCKET", ""))
    AWS_REGION: str = Field(default=os.getenv("AWS_REGION", ""))
    AWS_ACCESS_KEY_ID: str = Field(default=os.getenv("AWS_ACCESS_KEY_ID", ""))
    AWS_SECRET_ACCESS_KEY: str = Field(default=os.getenv("AWS_SECRET_ACCESS_KEY", ""))
    VIDEO_STORAGE_PATH: str = Field(default=os.getenv("VIDEO_STORAGE_PATH", "/opt/render/project/src/nr1-main/videos"))
    LOG_FILE_PATH: str = Field(default=os.getenv("LOG_FILE_PATH", ""))
    CORS_ORIGINS_RAW: str = Field(default=os.getenv("CORS_ORIGINS", "*"))

    @property
    def CORS_ORIGINS(self) -> List[str]:
        return parse_cors_origins(self.CORS_ORIGINS_RAW)

settings = Settings()

logging.basicConfig(level=logging.INFO)
logging.info(f"ENV: {settings.ENV}")
logging.info(f"PORT: {settings.PORT}")
logging.info(f"CORS_ORIGINS: {settings.CORS_ORIGINS}")
logging.info(f"VIDEO_STORAGE_PATH: {settings.VIDEO_STORAGE_PATH}")
