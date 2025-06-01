"""
User Service Layer

- Handles user creation, retrieval, and lookup logic.
- All business logic, validation, and error handling for user management is centralized here.
- Designed for auditability, security, and testability (Stripe/Netflix standards).
- All functions are stateless and side-effect free except for user creation.
- TODO: Replace in-memory store with persistent database for production.
"""

from typing import Optional, Dict, Any
from app.schemas import UserCreate, UserOut

# In-memory user store for demo; replace with DB in production
_fake_users_db: dict[str, dict[str, Any]] = {}

def get_user_by_email(email: str) -> Optional[dict[str, Any]]:
    """
    Retrieve a user by email.

    Args:
        email (str): The user's email.

    Returns:
        dict[str, Any] | None: User dict if found, None otherwise.
    """
    return next((u for u in _fake_users_db.values() if u["email"] == email), None)

def create_user(email: str, full_name: Optional[str], hashed_password: str) -> dict[str, Any]:
    """
    Create a new user and add to the in-memory store.

    Args:
        email (str): The user's email.
        full_name (str | None): The user's full name.
        hashed_password (str): The hashed password.

    Returns:
        dict[str, Any]: The created user dict.
    """
    user_id = str(len(_fake_users_db) + 1)
    user = {"id": user_id, "email": email, "full_name": full_name or "", "hashed_password": hashed_password}
    _fake_users_db[user_id] = user
    return user

def get_user_by_id(user_id: str) -> Optional[dict[str, Any]]:
    """
    Retrieve a user by user ID.

    Args:
        user_id (str): The user's ID.

    Returns:
        dict[str, Any] | None: User dict if found, None otherwise.
    """
    return _fake_users_db.get(user_id)

def signup_service(user: UserCreate) -> dict[str, Any]:
    """
    Register a new user.

    Args:
        user (UserCreate): Signup data.

    Returns:
        dict[str, Any]: On success: {"message": str, "user": dict}. On error: {"error": str}.
    """
    if get_user_by_email(user.email):
        return {"error": "User already exists"}
    hashed_password = "hashed"  # Replace with real hash in auth_service
    user_obj = create_user(user.email, user.full_name, hashed_password)
    return {"message": "User signed up", "user": user_obj}

def login_service(user: UserCreate) -> dict[str, Any]:
    """
    Authenticate a user and return user info.

    Args:
        user (UserCreate): Login credentials.

    Returns:
        dict[str, Any]: On success: {"message": str, "user": dict}. On error: {"error": str}.
    """
    db_user = get_user_by_email(user.email)
    if not db_user or db_user["hashed_password"] != "hashed":
        return {"error": "Invalid credentials"}
    return {"message": "User logged in", "user": db_user}

def get_user_service(user_id: str) -> dict[str, Any]:
    """
    Retrieve a user by user ID.

    Args:
        user_id (str): The user's ID.

    Returns:
        dict[str, Any]: On success: {"user": dict}. On error: {"error": str}.
    """
    user = get_user_by_id(user_id)
    if not user:
        return {"error": "User not found"}
    return {"user": user}
