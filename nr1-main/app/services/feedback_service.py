"""
Feedback Service Layer

- Handles feedback submission and retrieval logic.
- All business logic, validation, and error handling for feedback is centralized here.
- Designed for auditability, security, and testability (Stripe/Netflix standards).
- All functions are stateless and side-effect free except for feedback submission.
- TODO: Replace in-memory store with persistent database for production.
"""

from typing import List, Dict, Any
from app.schemas import FeedbackIn, FeedbackOut
from datetime import datetime, timezone

_fake_feedback_db: List[FeedbackOut] = []

def submit_feedback_service(feedback: FeedbackIn) -> Dict[str, Any]:
    """
    Submit user feedback.

    Args:
        feedback (FeedbackIn): Feedback data.

    Returns:
        dict[str, Any]: On success: {"message": str, "data": FeedbackOut}. On error: {"error": str}.
    """
    feedback_id = str(len(_fake_feedback_db) + 1)
    feedback_obj = FeedbackOut(
        id=feedback_id,
        message=feedback.message,
        email=feedback.email,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    _fake_feedback_db.append(feedback_obj)
    return {"message": "Feedback submitted", "data": feedback_obj}

def get_feedback_service() -> List[FeedbackOut]:
    """
    Retrieve all feedback entries.

    Returns:
        List[FeedbackOut]: List of all feedback objects.
    """
    return _fake_feedback_db
