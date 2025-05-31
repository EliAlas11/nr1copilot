from pydantic import BaseModel, Field

class AnalyticsSubmitRequest(BaseModel):
    event: str = Field(..., description="Analytics event name")
    user_id: str = Field(None, description="User ID (optional)")
    data: dict = Field(default_factory=dict, description="Event data")
