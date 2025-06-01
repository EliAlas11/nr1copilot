"""
Pydantic models for authentication request validation.
(Deprecated: Prefer using app/schemas.py for all request/response models.)
"""

from pydantic import BaseModel, Field


class AuthSignupRequest(BaseModel):
    """Request model for user signup."""

    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=6)
    email: str = Field(..., description="User email")


class AuthLoginRequest(BaseModel):
    """Request model for user login."""

    username: str = Field(...)
    password: str = Field(...)


class AuthRefreshRequest(BaseModel):
    """Request model for JWT refresh."""

    refresh_token: str = Field(...)
