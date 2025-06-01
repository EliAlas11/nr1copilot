from app.schemas import UserCreate, UserLogin
from ..services.user_service import (
    signup_service,
    login_service,
    get_user_service,
)

def signup(user: UserCreate):
    return signup_service(user)

def login(user: UserLogin):
    return login_service(user)

def get_user(user_id: str):
    return get_user_service(user_id)
