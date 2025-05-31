from fastapi import HTTPException, status
from ..services.feedback_service import (
    submit_feedback_service,
    get_feedback_service,
)

def submit_feedback(data):
    return submit_feedback_service(data)

def get_feedback():
    return get_feedback_service()
