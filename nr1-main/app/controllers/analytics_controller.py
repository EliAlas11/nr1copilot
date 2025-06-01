"""
Analytics controller for analytics endpoints.
- Handles analytics submission and retrieval using Pydantic models.
- Delegates business logic to the analytics service layer.
"""

from app.schemas import AnalyticsIn
from ..services.analytics_service import submit_analytics_service, get_analytics_service

def submit_analytics(analytics: AnalyticsIn):
    """Submit an analytics event."""
    return submit_analytics_service(analytics)

def get_analytics():
    """Retrieve all analytics events."""
    return get_analytics_service()
