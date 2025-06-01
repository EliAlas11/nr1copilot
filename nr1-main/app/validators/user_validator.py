"""
Pydantic models for user request validation.
(Deprecated: Prefer using app/schemas.py for all request/response models.)
"""

from pydantic import BaseModel, Field
from typing import Optional

class UserSignupRequest(BaseModel):
    """Request model for user signup."""
    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=6)
    email: str = Field(..., description="User email")

class UserLoginRequest(BaseModel):
    """Request model for user login."""
    username: str = Field(...)
    password: str = Field(...)
