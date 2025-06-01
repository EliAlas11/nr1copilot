"""
User Service Layer

- Handles user creation, retrieval, and lookup logic.
- All business logic, validation, and error handling for user management is centralized here.
- Designed for auditability, security, and testability (Stripe/Netflix standards).
- All functions are stateless and side-effect free except for user creation.
- TODO: Replace in-memory store with persistent database for production.
"""

from typing import Optional, Dict, Any
from app.schemas import UserCreate, UserLogin, UserOut
from passlib.context import CryptContext

class UserError(Exception):
    """Custom exception for user service errors."""
    pass

# In-memory user store for demo; replace with DB in production
_fake_users_db: dict[str, dict[str, Any]] = {}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user_by_email(email: str) -> Optional[dict[str, Any]]:
    """
    Retrieve a user by email.

    Args:
        email (str): The user's email.

    Returns:
        dict[str, Any] | None: User dict if found, None otherwise.
    """
    return next((u for u in _fake_users_db.values() if u["email"] == email), None)

def create_user(email: str, full_name: Optional[str], hashed_password: str) -> UserOut:
    """
    Create a new user and add to the in-memory store.

    Args:
        email (str): The user's email.
        full_name (str | None): The user's full name.
        hashed_password (str): The hashed password.

    Returns:
        UserOut: The created user object.
    """
    user_id = str(len(_fake_users_db) + 1)
    user = {"id": user_id, "email": email, "full_name": full_name or "", "hashed_password": hashed_password}
    _fake_users_db[user_id] = user
    return UserOut(id=user_id, email=email, full_name=full_name or "")

def get_user_by_id(user_id: str) -> Optional[dict[str, Any]]:
    """
    Retrieve a user by user ID.

    Args:
        user_id (str): The user's ID.

    Returns:
        dict[str, Any] | None: User dict if found, None otherwise.
    """
    return _fake_users_db.get(user_id)

def signup_service(user: UserCreate) -> UserOut:
    """
    Register a new user.

    Args:
        user (UserCreate): Signup data.

    Returns:
        UserOut: The registered user object.

    Raises:
        UserError: If the user already exists.
    """
    if get_user_by_email(user.email):
        raise UserError("User already exists")
    hashed_password = pwd_context.hash(user.password)
    return create_user(user.email, user.full_name, hashed_password)

def login_service(user: UserLogin) -> UserOut:
    """
    Authenticate a user and return user info.

    Args:
        user (UserLogin): Login credentials.

    Returns:
        UserOut: The authenticated user object.

    Raises:
        UserError: If the credentials are invalid.
    """
    db_user = get_user_by_email(user.email)
    if not db_user or not pwd_context.verify(user.password, db_user["hashed_password"]):
        raise UserError("Invalid credentials")
    return UserOut(id=db_user["id"], email=db_user["email"], full_name=db_user["full_name"])

def get_user_service(user_id: str) -> UserOut:
    """
    Retrieve a user by user ID.

    Args:
        user_id (str): The user's ID.

    Returns:
        UserOut: The user object.

    Raises:
        UserError: If the user is not found.
    """
    user = get_user_by_id(user_id)
    if not user:
        raise UserError("User not found")
    return UserOut(id=user["id"], email=user["email"], full_name=user["full_name"])
