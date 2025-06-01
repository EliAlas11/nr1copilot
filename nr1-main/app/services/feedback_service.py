"""
Feedback Service Layer (Refactored)

- Handles feedback submission and retrieval logic.
- All business logic, validation, and error handling for feedback is centralized here.
- Designed for auditability, security, and testability (Stripe/Netflix standards).
- All functions are stateless and side-effect free except for feedback submission.
- Implements audit logging and custom exceptions for compliance.
- TODO: Replace in-memory store with persistent database for production.
"""

import logging
from typing import List
from app.schemas import FeedbackIn, FeedbackOut
from datetime import datetime, timezone

logger = logging.getLogger("feedback_service")

class FeedbackError(Exception):
    """Custom exception for feedback service errors."""
    pass

_fake_feedback_db: List[FeedbackOut] = []

def submit_feedback_service(feedback: FeedbackIn) -> FeedbackOut:
    """
    Submit user feedback.

    Args:
        feedback (FeedbackIn): Feedback data.

    Returns:
        FeedbackOut: The created feedback object.

    Raises:
        FeedbackError: If feedback is invalid or cannot be saved.
    """
    if not feedback.message or len(feedback.message.strip()) == 0:
        logger.warning("Feedback message cannot be empty.")
        raise FeedbackError("Feedback message cannot be empty.")
    feedback_id = str(len(_fake_feedback_db) + 1)
    feedback_obj = FeedbackOut(
        id=feedback_id,
        message=feedback.message,
        email=feedback.email,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    _fake_feedback_db.append(feedback_obj)
    logger.info(f"AUDIT: Feedback submitted: {feedback_obj}")
    return feedback_obj

def get_feedback_service() -> List[FeedbackOut]:
    """
    Retrieve all feedback entries.

    Returns:
        List[FeedbackOut]: List of all feedback objects.
    """
    logger.info(f"AUDIT: Feedback retrieved: count={len(_fake_feedback_db)}")
    return _fake_feedback_db

# Test block for service sanity (not for production)
if __name__ == "__main__":
    try:
        test_feedback = FeedbackIn(message="Test feedback", email="test@example.com")
        out = submit_feedback_service(test_feedback)
        assert out.message == "Test feedback"
        all_feedback = get_feedback_service()
        assert isinstance(all_feedback, list)
        print("Feedback service test passed.")
    except Exception as e:
        print(f"Error: {e}")
