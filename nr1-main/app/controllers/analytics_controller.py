from fastapi import HTTPException, status
from ..services.analytics_service import (
    submit_analytics_service,
    get_analytics_service,
)

def submit_analytics(data):
    return submit_analytics_service(data)

def get_analytics():
    return get_analytics_service()
