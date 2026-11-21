from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class ChatTurn(BaseModel):
    role: str
    text: str


class ChatRequest(BaseModel):
    query: str
    fund: Optional[str] = None
    history: Optional[List[ChatTurn]] = None
    source_ui: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[str]
    timestamp: datetime
    query_id: Optional[int] = None
    latency_ms: Optional[int] = None
    outcome: Optional[str] = None
    engine: Optional[str] = None


class FeedbackRequest(BaseModel):
    query_id: int
    value: int  # 1 = helpful, -1 = not helpful


class EventRequest(BaseModel):
    event_name: str
    detail: Optional[str] = None
