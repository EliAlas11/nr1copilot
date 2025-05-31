from fastapi import APIRouter
from ..controllers.user_controller import (
    signup,
    login,
    get_user,
)

router = APIRouter(prefix="/api/v1/user", tags=["User"])

@router.post("/signup")
def signup_route(data: dict):
    return signup(data)

@router.post("/login")
def login_route(data: dict):
    return login(data)

@router.get("/{user_id}")
def get_user_route(user_id: str):
    return get_user(user_id)
