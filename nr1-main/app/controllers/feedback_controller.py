from fastapi import HTTPException
from typing import List
from app.schemas import FeedbackIn, FeedbackOut
from ..services.feedback_service import (
    submit_feedback_service,
    get_feedback_service,
    FeedbackError,
)

def submit_feedback(feedback: FeedbackIn) -> FeedbackOut:
    """
    Submit user feedback. Raises HTTPException on error.
    """
    try:
        return submit_feedback_service(feedback)
    except FeedbackError as e:
        raise HTTPException(status_code=400, detail=str(e))

def get_feedback() -> List[FeedbackOut]:
    """
    Retrieve all feedback entries.
    """
    return get_feedback_service()

# Minimal test/assertion to confirm endpoint signature compiles
if __name__ == "__main__":
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    resp = client.post("/api/v1/feedback", json={"message": "Test feedback"})
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data and "message" in data
