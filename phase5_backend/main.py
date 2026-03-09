from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api_routes import router as chat_router
from .health_check import router as health_router

app = FastAPI(
    title="Mutual Fund RAG Chatbot API",
    description="Backend API for the HDFC Mutual Fund RAG Chatbot. "
                "Provides factual answers about HDFC mutual fund schemes using Retrieval-Augmented Generation.",
    version="1.0.0",
)

# Allow frontend to connect (will be needed in Phase 6)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
