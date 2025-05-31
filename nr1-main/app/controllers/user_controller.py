from fastapi import HTTPException, status
from ..services.user_service import (
    signup_service,
    login_service,
    get_user_service,
)

def signup(data):
    return signup_service(data)

def login(data):
    return login_service(data)

def get_user(user_id: str):
    return get_user_service(user_id)
