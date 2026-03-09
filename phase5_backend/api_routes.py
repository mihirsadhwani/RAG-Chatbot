from datetime import datetime, timezone
from fastapi import APIRouter
from phase5_backend.schemas import ChatRequest, ChatResponse
from phase5_backend.guardrails import validate_query
from phase5_backend.rag_service import RAGService

router = APIRouter()

# Initialize the RAG service once at module load
rag_service = RAGService()


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    query = request.query.strip()
    fund = request.fund.strip() if request.fund else None
    print(f"[API] Query received: {query}" + (f" | Fund: {fund}" if fund else ""))

    # Step 1: Validate with guardrails
    validation = validate_query(query)
    if not validation["valid"]:
        print(f"[API] Query rejected by guardrails.")
        return ChatResponse(
            answer=validation["rejection_message"],
            sources=[],
            timestamp=datetime.now(timezone.utc),
        )

    # Step 2: Run RAG pipeline
    try:
        result = rag_service.ask(query, fund=fund)
    except Exception as e:
        print(f"[API] RAG pipeline error: {e}")
        return ChatResponse(
            answer="Sorry, an error occurred while processing your question. Please try again.",
            sources=[],
            timestamp=datetime.now(timezone.utc),
        )

    return ChatResponse(
        answer=result["answer"],
        sources=result["sources"],
        timestamp=datetime.now(timezone.utc),
    )
