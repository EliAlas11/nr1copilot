from fastapi import HTTPException, status
from app.schemas import AnalyticsIn
from ..services.analytics_service import (
    submit_analytics_service,
    get_analytics_service,
)

def submit_analytics(analytics: AnalyticsIn):
    return submit_analytics_service(analytics)

def get_analytics():
    return get_analytics_service()
