from app.schemas import AnalyticsIn, AnalyticsOut
from datetime import datetime
from typing import List

_fake_analytics_db = []

def submit_analytics_service(analytics: AnalyticsIn):
    analytics_id = str(len(_fake_analytics_db) + 1)
    analytics_obj = AnalyticsOut(
        id=analytics_id,
        event=analytics.event,
        user_id=analytics.user_id,
        metadata=analytics.metadata,
        timestamp=datetime.now().isoformat()
    )
    _fake_analytics_db.append(analytics_obj)
    return {"message": "Analytics submitted", "data": analytics_obj}

def get_analytics_service() -> List[AnalyticsOut]:
    return _fake_analytics_db
