"""
Pydantic models for video request validation.
(Deprecated: Prefer using app/schemas.py for all request/response models.)
"""

from pydantic import BaseModel, Field


class VideoValidateRequest(BaseModel):
    """Request model for validating a YouTube video URL."""

    url: str = Field(..., description="YouTube video URL")


class VideoProcessRequest(BaseModel):
    """Request model for processing a YouTube video."""

    video_id: str = Field(..., description="YouTube video ID")
    # Add more fields as needed for processing options
