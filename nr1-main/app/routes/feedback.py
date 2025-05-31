from fastapi import APIRouter
from ..controllers.feedback_controller import (
    submit_feedback,
    get_feedback,
)

router = APIRouter(prefix="/api/v1/feedback", tags=["Feedback"])

@router.post("/")
def submit(data: dict):
    return submit_feedback(data)

@router.get("/")
def get():
    return get_feedback()
