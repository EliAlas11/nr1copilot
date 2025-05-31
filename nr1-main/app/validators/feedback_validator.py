from pydantic import BaseModel, Field

class FeedbackSubmitRequest(BaseModel):
    message: str = Field(..., description="Feedback message")
    user_id: str = Field(None, description="User ID (optional)")

class FeedbackGetRequest(BaseModel):
    user_id: str = Field(None, description="User ID (optional)")
