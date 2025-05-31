from fastapi import APIRouter
from ..controllers.analytics_controller import (
    submit_analytics,
    get_analytics,
)

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])

@router.post("/")
def submit(data: dict):
    return submit_analytics(data)

@router.get("/")
def get():
    return get_analytics()
