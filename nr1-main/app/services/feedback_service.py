from app.schemas import FeedbackIn, FeedbackOut
from datetime import datetime
from typing import List

_fake_feedback_db = []

def submit_feedback_service(feedback: FeedbackIn):
    feedback_id = str(len(_fake_feedback_db) + 1)
    feedback_obj = FeedbackOut(
        id=feedback_id,
        message=feedback.message,
        email=feedback.email,
        created_at=datetime.utcnow().isoformat()
    )
    _fake_feedback_db.append(feedback_obj)
    return {"message": "Feedback submitted", "data": feedback_obj}

def get_feedback_service() -> List[FeedbackOut]:
    return _fake_feedback_db
