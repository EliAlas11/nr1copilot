import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import Field

load_dotenv()

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
    CORS_ORIGINS: list = Field(default_factory=lambda: os.getenv("CORS_ORIGINS", "*").split(","))

settings = Settings()
