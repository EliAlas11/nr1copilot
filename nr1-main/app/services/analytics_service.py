"""
Analytics Service Layer

- Handles analytics event submission and retrieval logic.
- All business logic, validation, and error handling for analytics is centralized here.
- Designed for auditability, security, and testability (Stripe/Netflix standards).
- All functions are stateless and side-effect free except for analytics submission.
- TODO: Replace in-memory store with persistent database for production.
"""

from typing import List, Dict, Any
from app.schemas import AnalyticsIn, AnalyticsOut
from datetime import datetime, timezone

_fake_analytics_db: List[AnalyticsOut] = []

def submit_analytics_service(analytics: AnalyticsIn) -> Dict[str, Any]:
    """
    Submit an analytics event.

    Args:
        analytics (AnalyticsIn): Analytics event data.

    Returns:
        dict[str, Any]: On success: {"message": str, "data": AnalyticsOut}. On error: {"error": str}.
    """
    analytics_id = str(len(_fake_analytics_db) + 1)
    analytics_obj = AnalyticsOut(
        id=analytics_id,
        event=analytics.event,
        user_id=analytics.user_id,
        metadata=analytics.metadata,
        timestamp=datetime.now(timezone.utc).isoformat()
    )
    _fake_analytics_db.append(analytics_obj)
    return {"message": "Analytics submitted", "data": analytics_obj}

def get_analytics_service() -> List[AnalyticsOut]:
    """
    Retrieve all analytics events.

    Returns:
        List[AnalyticsOut]: List of all analytics event objects.
    """
    return _fake_analytics_db
