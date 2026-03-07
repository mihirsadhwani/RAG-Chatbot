from pydantic import BaseModel
from datetime import datetime
from typing import List


class ChatRequest(BaseModel):
    query: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[str]
    timestamp: datetime
