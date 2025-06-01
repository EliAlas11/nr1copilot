from fastapi import HTTPException, status
from app.schemas import UserCreate, UserLogin
from ..services.auth_service import (
    signup_service,
    login_service,
    refresh_token_service,
)

def signup(user: UserCreate):
    return signup_service(user)

def login(user: UserLogin):
    return login_service(user)

def refresh_token(token: str):
    return refresh_token_service(token)
