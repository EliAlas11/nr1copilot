"""
Pydantic models for analytics request validation.
(Deprecated: Prefer using app/schemas.py for all request/response models.)
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class AnalyticsSubmitRequest(BaseModel):
    """Request model for submitting analytics events."""

    event: str = Field(..., description="Analytics event name")
    user_id: Optional[str] = Field(None, description="User ID (optional)")
    data: Dict[str, Any] = Field(default_factory=dict, description="Event data")
