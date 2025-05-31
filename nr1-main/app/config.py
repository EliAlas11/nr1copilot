import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List

load_dotenv()

def parse_cors_origins(value: str) -> List[str]:
    if not value or value.strip() == "":
        return ["*"]
    value = value.strip()
    if value.startswith("[") and value.endswith("]"):
        import json
        try:
            return json.loads(value)
        except Exception:
            pass
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
    CORS_ORIGINS: List[str] = Field(default_factory=lambda: parse_cors_origins(os.getenv("CORS_ORIGINS", "*")))

settings = Settings()
