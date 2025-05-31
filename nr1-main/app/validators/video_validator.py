from pydantic import BaseModel, Field

class VideoValidateRequest(BaseModel):
    url: str = Field(..., description="YouTube video URL")

class VideoProcessRequest(BaseModel):
    video_id: str = Field(..., description="YouTube video ID")
    # Add more fields as needed for processing options
