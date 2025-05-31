from fastapi import APIRouter
from ..controllers.auth_controller import (
    signup,
    login,
    refresh_token,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

@router.post("/signup")
def signup_route(data: dict):
    return signup(data)

@router.post("/login")
def login_route(data: dict):
    return login(data)

@router.post("/refresh")
def refresh_route(data: dict):
    return refresh_token(data)
