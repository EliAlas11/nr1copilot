from app.schemas import FeedbackIn
from ..services.feedback_service import (
    submit_feedback_service,
    get_feedback_service,
)

def submit_feedback(feedback: FeedbackIn):
    return submit_feedback_service(feedback)

def get_feedback():
    return get_feedback_service()
