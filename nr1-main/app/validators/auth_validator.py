from pydantic import BaseModel, Field

class AuthSignupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=6)
    email: str = Field(..., description="User email")

class AuthLoginRequest(BaseModel):
    username: str = Field(...)
    password: str = Field(...)

class AuthRefreshRequest(BaseModel):
    refresh_token: str = Field(...)
