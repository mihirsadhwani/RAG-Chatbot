from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class ChatRequest(BaseModel):
    query: str
    fund: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[str]
    timestamp: datetime
