import os
import json
import numpy as np
import google.generativeai as genai
from dotenv import load_dotenv, find_dotenv

# Load .env from project root
load_dotenv(find_dotenv(usecwd=True))


def cosine_similarity(v1, v2):
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))


class RAGService:
    """
    Wraps the Phase-4 retrieval + generation pipeline for use by the backend API.
    Uses the embeddings.json from Phase 3 for vector search via NumPy cosine similarity.
    Resolves all file paths relative to the project root to avoid CWD issues.
    """

    def __init__(self):
        # Resolve project root (parent of phase5_backend)
        self.project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

        # Paths
        self.embeddings_path = os.path.join(self.project_root, "phase3_embeddings", "output", "embeddings.json")

        # API key
        api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is not set.")
        genai.configure(api_key=api_key)

        self.embedding_model = "models/gemini-embedding-001"

        # --- Load embeddings for vector search ---
        self.store_data = []
        if os.path.exists(self.embeddings_path):
            with open(self.embeddings_path, "r", encoding="utf-8") as f:
                self.store_data = json.load(f)
            print(f"[RAGService] Loaded {len(self.store_data)} embedded chunks from {self.embeddings_path}")
        else:
            print(f"[RAGService] WARNING: embeddings.json not found at {self.embeddings_path}")

        # --- Generator setup ---
        system_instruction = """You are a mutual fund information assistant.

Answer the question using ONLY the provided context.

Rules:
1. Only provide factual information
2. Do not give investment advice. If asked questions like "Should I invest in this fund?" or "Which fund is better?", respond exactly with: "I can only provide factual information about mutual funds, not investment advice."
3. Keep answers short (max 3 sentences)
4. Always include the Groww source link corresponding to the fund context."""

        self.llm = genai.GenerativeModel("gemini-2.5-flash", system_instruction=system_instruction)
        print("[RAGService] Generator (gemini-2.5-flash) initialized.")

    # ------------------------------------------------------------------ #
    #  Retrieval
    # ------------------------------------------------------------------ #
    def _retrieve(self, query: str, top_k: int = 3) -> list:
        print("[RAGService] Generating embedding")
        result = genai.embed_content(
            model=self.embedding_model,
            content=query,
            task_type="retrieval_query",
        )
        query_vector = np.array(result["embedding"])

        print("[RAGService] Searching vector DB")
        scored = []
        for row in self.store_data:
            v = np.array(row["embedding"])
            score = cosine_similarity(query_vector, v)
            scored.append((score, row))
        scored.sort(key=lambda x: x[0], reverse=True)

        chunks = [
            {
                "document_text": row["text"],
                "fund_name": row["fund_name"],
                "source_url": row["source_url"],
                "similarity_score": float(sc),
            }
            for sc, row in scored[:top_k]
        ]
        print(f"[RAGService] Retrieved {len(chunks)} chunks")
        return chunks

    # ------------------------------------------------------------------ #
    #  Generation
    # ------------------------------------------------------------------ #
    def _generate(self, chunks: list, query: str) -> dict:
        print("[RAGService] Sending prompt to Gemini")
        context_parts = []
        unique_sources = set()
        for chunk in chunks:
            context_parts.append(
                f"Fund Name: {chunk['fund_name']}\nContent: {chunk['document_text']}\nSource: {chunk['source_url']}"
            )
            unique_sources.add(chunk["source_url"])

        context_str = "\n\n---\n\n".join(context_parts)
        prompt = f"Context:\n{context_str}\n\nUser Question:\n{query}\n\nAnswer:"

        response = self.llm.generate_content(prompt)
        print("[RAGService] Answer generated")

        return {
            "answer": response.text.strip(),
            "sources": list(unique_sources),
        }

    # ------------------------------------------------------------------ #
    #  Public API
    # ------------------------------------------------------------------ #
    def ask(self, query: str) -> dict:
        """
        Full RAG pipeline: retrieve relevant chunks then generate an answer.
        Returns {"answer": str, "sources": list[str]}
        """
        print(f"[RAGService] Query received: {query}")

        chunks = self._retrieve(query)
        result = self._generate(chunks, query)
        return result
