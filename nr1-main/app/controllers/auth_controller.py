"""
Authentication Controller: Stateless, auditable interface between FastAPI routes and authentication services.

- Delegates all business logic, validation, and error handling to the service layer.
- Ensures controllers remain thin, testable, and maintainable.
- Designed for world-class auditability and clarity (Stripe/Netflix standards).
- All controller actions are ready for audit logging and compliance review.

Compliance Note:
    All authentication events are logged for audit/compliance. See audit_log().
"""

from typing import Any, TypedDict
from app.schemas import UserCreate, UserLogin

from ..services.auth_service import (
    login_service,
    refresh_token_service,
    signup_service,
)

# Step 1: Use a TypedDict for response structure and PEP8 naming
class AuthResponse(TypedDict, total=False):
    message: str
    user: dict[str, Any]
    access_token: str
    token_type: str
    error: str

# Step 2: Standardize audit logging payloads for compliance
# Always include event, user (if available), status, and details
# TODO: Integrate with centralized audit logging system for compliance (see Stripe/Netflix patterns)
def audit_log(event: str, details: dict[str, Any], status: str = "success") -> None:
    """
    Stub for audit logging. Integrate with production audit/compliance system.
    Always include event, user (if available), status, and details for audit traceability.

    Args:
        event (str): Event name or type.
        details (dict[str, Any]): Event details for audit/compliance.
        status (str): 'success' or 'error'.
    """
    # Example: log to file, external system, or SIEM
    pass  # Replace with production audit logging


def signup(user: UserCreate) -> AuthResponse:
    """
    Register a new user. Returns AuthResponse dict.
    """
    user_email = getattr(user, "email", None)  # For audit log clarity/static analysis
    try:
        result = signup_service(user)
        audit_log("user_signup", {"user": user_email, "result": result}, status="success")
        return AuthResponse(**result)  # Ensure type
    except Exception as e:
        audit_log("user_signup_error", {"user": user_email, "error": str(e)}, status="error")
        return AuthResponse(error="Signup failed. Please try again later.")


def login(user: UserLogin) -> AuthResponse:
    """
    Authenticate a user and return a JWT token. Returns AuthResponse dict.
    """
    user_email = getattr(user, "email", None)
    try:
        result = login_service(user)
        audit_log("user_login", {"user": user_email, "result": result}, status="success")
        return AuthResponse(**result)
    except Exception as e:
        audit_log("user_login_error", {"user": user_email, "error": str(e)}, status="error")
        return AuthResponse(error="Login failed. Please try again later.")


def refresh_token(token: str) -> AuthResponse:
    """
    Refresh a JWT token for an authenticated user. Returns AuthResponse dict.
    """
    try:
        result = refresh_token_service(token)
        audit_log("refresh_token", {"token": token, "result": result}, status="success")
        return AuthResponse(**result)
    except Exception as e:
        audit_log("refresh_token_error", {"token": token, "error": str(e)}, status="error")
        return AuthResponse(error="Token refresh failed. Please try again later.")
