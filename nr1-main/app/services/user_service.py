from typing import Optional
from app.schemas import UserCreate, UserOut

# In-memory user store for demo; replace with DB in production
_fake_users_db = {}

def get_user_by_email(email: str) -> Optional[dict]:
    return next((u for u in _fake_users_db.values() if u["email"] == email), None)

def create_user(email: str, full_name: Optional[str], hashed_password: str) -> dict:
    user_id = str(len(_fake_users_db) + 1)
    user = {"id": user_id, "email": email, "full_name": full_name or "", "hashed_password": hashed_password}
    _fake_users_db[user_id] = user
    return user

def get_user_by_id(user_id: str) -> Optional[dict]:
    return _fake_users_db.get(user_id)

def signup_service(user: UserCreate):
    if get_user_by_email(user.email):
        return {"error": "User already exists"}
    hashed_password = "hashed"  # Replace with real hash in auth_service
    user_obj = create_user(user.email, user.full_name, hashed_password)
    return {"message": "User signed up", "user": user_obj}

def login_service(user: UserCreate):
    db_user = get_user_by_email(user.email)
    if not db_user or db_user["hashed_password"] != "hashed":
        return {"error": "Invalid credentials"}
    return {"message": "User logged in", "user": db_user}

def get_user_service(user_id: str):
    user = get_user_by_id(user_id)
    if not user:
        return {"error": "User not found"}
    return {"user": user}
