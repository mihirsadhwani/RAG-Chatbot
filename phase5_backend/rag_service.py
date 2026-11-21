import os
import re
import time
import json
import requests
from dotenv import load_dotenv, find_dotenv
from phase5_backend import knowledge_base as kb

# Load .env from project root
load_dotenv(find_dotenv(usecwd=True))

def normalize_query(query: str) -> str:
    """Add the detected scheme name to the retrieval query without assuming an AMC."""
    detected = kb.detect_funds(query)
    if len(detected) != 1:
        return query
    q_lower = query.lower()
    if any(s.lower() in q_lower for s in kb.load_funds()):
        return query
    return f"{query} {detected[0]}"


# Fast models only; called via direct HTTPS REST with a strict 6s timeout (no gRPC 60s hang)
GENERATION_MODELS = [
    "gemini-3-flash-preview",
    "gemini-flash-lite-latest",
]

NO_INFO_RESPONSE = (
    "I couldn't find that information in the knowledge base yet. "
    "Try asking about NAV, SIP amount, expense ratio, holdings, or sector allocation."
)

SYSTEM_INSTRUCTION = """You are a factual mutual fund data assistant for the indexed schemes in the knowledge base.
Answer the user's question using ONLY the Knowledge Base Context provided below.

Capabilities & Rules:
1. Return EXACT values (NAV, NAV date, expense ratio, minimum SIP, AUM, 1D/1Y/3Y/5Y/10Y/All returns, category averages, category ranks, portfolio composition equity/debt/cash/real estate, equity & debt sector allocations, exit load, stamp duty, tax rules, fund managers, and holdings with exact allocation %).
2. Handle indirect, roundabout, multi-step, comparative, or superlative questions across the schemes in context. Compare only schemes whose values are present in the context.
3. Understand English, Hindi, and Hinglish (including typos or casual phrasing). Respond clearly and concisely (1–4 sentences or clean bullet points).
4. Use conversation history if the user asks a follow-up question ("aur iska exit load?", "what about its manager?", "top 5 holdings?").
5. Never give subjective investment advice or tell the user which fund they should buy/sell. Factual comparisons and rankings from the data ARE allowed.
6. If the requested fact is genuinely absent from the context, state that it is not available in the provided context.
7. Always include the relevant source URL(s) from the context at the end of your answer."""


class RAGService:
    """Fast Hybrid Structured Knowledge Base + Chunk Retrieval + Gemini REST Generation service."""

    def __init__(self):
        self.project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        self.embeddings_path = os.path.join(
            self.project_root, "phase3_embeddings", "output", "embeddings.json"
        )

        self.api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY / GEMINI_API_KEY is not set.")

        self.embedding_model = "models/gemini-embedding-001"
        self.system_instruction = SYSTEM_INSTRUCTION
        self.session = requests.Session()
        self.cooldown_until = {}

        self.store_data = []
        if os.path.exists(self.embeddings_path):
            with open(self.embeddings_path, "r", encoding="utf-8") as f:
                raw_chunks = json.load(f)
            # Keep lightweight text metadata in memory (no need to iterate 3072-float arrays on CPU)
            self.store_data = [
                {
                    "text": r["text"],
                    "fund_name": r["fund_name"],
                    "source_url": r["source_url"],
                    "tokens": set(re.findall(r"[a-z0-9]+", r["text"].lower())),
                }
                for r in raw_chunks
            ]
            print(f"[RAGService] Loaded {len(self.store_data)} indexed chunks from {self.embeddings_path}")

        print(f"[RAGService] Fast Hybrid KB Generator initialized ({len(kb.load_funds())} funds).")

    def _retrieve_fast(self, query: str, fund: str | None = None, top_k: int = 5) -> list:
        """Instant (<1ms) local chunk retrieval without a blocking remote embedding network call."""
        if not self.store_data:
            return []
        q_tokens = set(re.findall(r"[a-z0-9]+", query.lower()))
        if not q_tokens:
            return []

        search_data = self.store_data
        if fund:
            filtered = [row for row in self.store_data if row["fund_name"].lower() == fund.lower()]
            if filtered:
                search_data = filtered

        scored = []
        for row in search_data:
            overlap = len(q_tokens & row["tokens"]) / max(len(q_tokens), 1)
            scored.append((overlap, row))
        scored.sort(key=lambda x: x[0], reverse=True)

        return [
            {
                "document_text": row["text"],
                "fund_name": row["fund_name"],
                "source_url": row["source_url"],
                "similarity_score": round(float(sc), 3),
            }
            for sc, row in scored[:top_k]
        ]

    def _call_gemini_rest(self, model_name: str, user_prompt: str, timeout: float = 5.5) -> str | None:
        """Direct REST call to Gemini with strict timeout and 429 cooldown tracking."""
        now = time.time()
        if self.cooldown_until.get(model_name, 0) > now:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
        payload = {
            "system_instruction": {"parts": [{"text": self.system_instruction}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 450},
        }
        try:
            resp = self.session.post(
                url,
                params={"key": self.api_key},
                json=payload,
                timeout=timeout,
            )
            if resp.status_code == 429:
                print(f"[RAGService] {model_name} hit 429 rate limit; cooling down for 180s.")
                self.cooldown_until[model_name] = now + 180
                return None
            if not resp.ok:
                print(f"[RAGService] {model_name} HTTP {resp.status_code}: {resp.text[:120]}")
                self.cooldown_until[model_name] = now + 60
                return None
            data = resp.json()
            candidates = data.get("candidates") or []
            if not candidates:
                return None
            parts = candidates[0].get("content", {}).get("parts") or []
            text = "".join(p.get("text", "") for p in parts).strip()
            return text or None
        except requests.Timeout:
            print(f"[RAGService] {model_name} timed out after {timeout}s; cooling down for 120s.")
            self.cooldown_until[model_name] = now + 120
            return None
        except Exception as e:
            print(f"[RAGService] {model_name} request error: {e}")
            return None

    def ask(self, query: str, fund: str | None = None, history: list | None = None) -> dict:
        t0 = time.perf_counter()
        print(f"[RAGService] Query received: {query}")

        greeting_re = re.compile(
            r"^(hi+|hello+|hey+|namaste|namaskar|hola|good\s+(morning|afternoon|evening)|greetings|kaise\s+ho|kya\s+haal)[\s!.,?]*$",
            re.IGNORECASE,
        )
        if greeting_re.match(query.strip()):
            return {
                "answer": (
                    "Hello! I am your mutual fund assistant backed by your indexed knowledge base. "
                    "You can ask me direct or indirect questions about NAV, expense ratio, minimum SIP, AUM, "
                    "1Y/3Y/5Y/10Y returns, category ranks, portfolio equity/debt/cash split, sector allocation, "
                    "exit loads, taxation, fund managers, or scheme holdings across HDFC, ICICI Prudential, SBI, Axis, and Bandhan (formerly IDFC)."
                ),
                "sources": [],
                "top_score": None,
                "fund": None,
                "engine": "greeting",
            }

        kb_context, used_funds, primary_fund = kb.build_context(
            query, history=history, preferred_fund=fund
        )
        funds_map = kb.load_funds()
        sources = [
            funds_map[n]["source_url"]
            for n in used_funds
            if n in funds_map and funds_map[n].get("source_url")
        ]

        norm_q = normalize_query(query)
        chunks = self._retrieve_fast(norm_q, fund=primary_fund)
        top_score = chunks[0]["similarity_score"] if chunks else 1.0

        history_str = ""
        if history:
            recent_turns = history[-6:]
            formatted_turns = [
                f"{t.get('role', 'user').upper()}: {t.get('text', '')}"
                for t in recent_turns
                if isinstance(t, dict) and t.get("text")
            ]
            if formatted_turns:
                history_str = "Recent Conversation History:\n" + "\n".join(formatted_turns) + "\n\n"

        user_prompt = (
            f"Knowledge Base Context:\n{kb_context}\n\n"
            f"{history_str}"
            f"User Question:\n{query}\n\n"
            f"Answer (cite exact values from the Knowledge Base Context and include the Groww Source URL):"
        )

        answer = None
        engine_used = None
        for model_name in GENERATION_MODELS:
            text = self._call_gemini_rest(model_name, user_prompt, timeout=2.5)
            if text:
                answer = text
                engine_used = model_name
                elapsed_ms = int((time.perf_counter() - t0) * 1000)
                print(f"[RAGService] Answer generated via {model_name} in {elapsed_ms}ms")
                break

        if answer is None:
            fb = kb.deterministic_fallback_answer(query, used_funds, primary_fund)
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            print(f"[RAGService] Answered via instant deterministic KB engine in {elapsed_ms}ms")
            return {
                "answer": fb["answer"],
                "sources": fb["sources"],
                "top_score": top_score,
                "fund": primary_fund,
                "engine": "kb_fallback",
            }

        not_avail_phrases = [
            "not available in the provided context",
            "not found in the provided context",
            "information is not available",
            "no information available",
        ]
        if any(phrase in answer.lower() for phrase in not_avail_phrases):
            answer = NO_INFO_RESPONSE
            sources = []

        return {
            "answer": answer,
            "sources": sources,
            "top_score": top_score,
            "fund": primary_fund,
            "engine": engine_used,
        }
