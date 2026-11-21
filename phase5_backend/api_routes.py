import os
import json
import time
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from phase5_backend.schemas import ChatRequest, ChatResponse, FeedbackRequest, EventRequest
from phase5_backend.guardrails import validate_query
from phase5_backend.rag_service import RAGService, GENERATION_MODELS
from phase5_backend import analytics, knowledge_base as kb

router = APIRouter()

# Initialize the RAG service once at module load
rag_service = RAGService()
analytics.init_db()


def _funds_path():
    return kb.get_funds_path()


@router.get("/api/funds")
def get_funds():
    path = _funds_path()
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Knowledge base funds file not found.")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/api/status")
def get_status():
    """Data freshness and knowledge-base health for the UI."""
    path = _funds_path()
    nav_dates, last_sync = [], None
    if os.path.exists(path):
        last_sync = datetime.fromtimestamp(os.path.getmtime(path), tz=timezone.utc).isoformat()
        with open(path, "r", encoding="utf-8") as f:
            nav_dates = [d.get("nav_date") for d in json.load(f) if d.get("nav_date")]
    funds = kb.load_funds()
    return {
        "funds_indexed": len(funds),
        "chunks_indexed": len(rag_service.store_data),
        "latest_nav_date": nav_dates[0] if nav_dates else None,
        "last_data_sync": last_sync,
        "generator_model": " -> ".join(GENERATION_MODELS) + " -> kb_fallback",
        "embedding_model": rag_service.embedding_model,
    }


@router.get("/api/analytics")
def get_analytics():
    return analytics.summary()


@router.get("/api/eval")
def get_eval():
    """Return latest Golden Eval benchmark summary for the in-app scorecard."""
    eval_path = os.path.join(rag_service.project_root, "eval", "results.json")
    if not os.path.exists(eval_path):
        return {"available": False, "summary": {}, "total": 0, "passed": 0}
    with open(eval_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    results = data.get("results") or []
    passed = sum(1 for r in results if r.get("passed"))
    return {
        "available": True,
        "summary": data.get("summary") or {},
        "total": len(results),
        "passed": passed,
        "pass_rate": round(100 * passed / len(results), 1) if results else 0,
    }


@router.post("/api/feedback")
def post_feedback(req: FeedbackRequest):
    if req.value not in (1, -1):
        raise HTTPException(status_code=422, detail="value must be 1 or -1")
    if not analytics.set_feedback(req.query_id, req.value):
        raise HTTPException(status_code=404, detail="query_id not found")
    return {"ok": True}


@router.post("/api/event")
def post_event(req: EventRequest):
    analytics.log_event(req.event_name, req.detail)
    return {"ok": True}


@router.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    query = request.query.strip()
    fund = request.fund.strip() if request.fund else None
    history = [t.model_dump() for t in request.history] if request.history else None
    source_ui = request.source_ui or "chat_input"
    started = time.perf_counter()
    print(f"[API] chat endpoint called: query='{query}', fund='{fund}', source_ui='{source_ui}'")

    def elapsed():
        return int((time.perf_counter() - started) * 1000)

    # Step 1: Validate with guardrails
    validation = validate_query(query)
    if not validation["valid"]:
        ms = elapsed()
        qid = analytics.log_query(
            query, fund, ms, None, "blocked", engine="guardrail", source_ui=source_ui
        )
        return ChatResponse(
            answer=validation["rejection_message"],
            sources=[],
            timestamp=datetime.now(timezone.utc),
            query_id=qid,
            latency_ms=ms,
            outcome="blocked",
            engine="guardrail",
        )

    # Step 2: Run RAG pipeline
    try:
        result = rag_service.ask(query, fund=fund, history=history)
    except Exception as e:
        print(f"[API] RAG pipeline error: {e}")
        ms = elapsed()
        qid = analytics.log_query(
            query, fund, ms, None, "error", engine="error", source_ui=source_ui
        )
        return ChatResponse(
            answer="Sorry, an error occurred while processing your question. Please try again.",
            sources=[],
            timestamp=datetime.now(timezone.utc),
            query_id=qid,
            latency_ms=ms,
            outcome="error",
            engine="error",
        )

    ms = elapsed()
    outcome = analytics.classify_outcome(result["answer"], result["sources"])
    engine = result.get("engine") or "gemini"
    qid = analytics.log_query(
        query,
        result.get("fund") or fund,
        ms,
        result.get("top_score"),
        outcome,
        len(result["sources"]),
        engine=engine,
        source_ui=source_ui,
    )
    return ChatResponse(
        answer=result["answer"],
        sources=result["sources"],
        timestamp=datetime.now(timezone.utc),
        query_id=qid,
        latency_ms=ms,
        outcome=outcome,
        engine=engine,
    )
