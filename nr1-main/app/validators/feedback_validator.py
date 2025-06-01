"""
Pydantic models for feedback request validation.
(Deprecated: Prefer using app/schemas.py for all request/response models.)
"""

from pydantic import BaseModel, Field
from typing import Optional

class FeedbackSubmitRequest(BaseModel):
    """Request model for submitting feedback."""
    message: str = Field(..., description="Feedback message")
    user_id: Optional[str] = Field(None, description="User ID (optional)")

class FeedbackGetRequest(BaseModel):
    """Request model for getting feedback (optionally by user)."""
    user_id: Optional[str] = Field(None, description="User ID (optional)")
