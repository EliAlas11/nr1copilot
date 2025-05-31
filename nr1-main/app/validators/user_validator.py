from pydantic import BaseModel, Field

class UserSignupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=6)
    email: str = Field(..., description="User email")

class UserLoginRequest(BaseModel):
    username: str = Field(...)
    password: str = Field(...)
