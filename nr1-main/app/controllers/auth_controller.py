from fastapi import HTTPException, status
from ..services.auth_service import (
    signup_service,
    login_service,
    refresh_token_service,
)

def signup(data):
    return signup_service(data)

def login(data):
    return login_service(data)

def refresh_token(data):
    return refresh_token_service(data)
