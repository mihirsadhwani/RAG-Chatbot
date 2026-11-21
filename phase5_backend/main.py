import sys
import os
import time

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from phase5_backend.api_routes import router as chat_router
from phase5_backend.health_check import router as health_router

app = FastAPI(
    title="Mutual Fund RAG Chatbot API",
    description="Backend API for the multi-AMC mutual fund RAG assistant. "
                "Provides source-grounded facts about indexed mutual fund schemes.",
    version="1.0.0",
)

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"[DEBUG] Request: {request.method} {request.url.path}")
    response = await call_next(request)
    print(f"[DEBUG] Response: {response.status_code}")
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[CRITICAL ERROR] {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "message": str(exc)},
    )

# Register routes
app.include_router(health_router)
app.include_router(chat_router)


@app.on_event("startup")
async def startup_event():
    print("[Server] Mutual Fund RAG Chatbot API started.")
    print("[Server] Endpoints:")
    print("[Server]   GET  /health")
    print("[Server]   POST /api/chat")
