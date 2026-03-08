# Mutual Fund RAG Chatbot - System Architecture

This document outlines the phase-wise system architecture of the Mutual Fund RAG (Retrieval-Augmented Generation) Chatbot project. The system is built using a modular micro-architecture approach where each distinct process operates independently, interconnected through file checkpoints and standard API schemas.

---

## 🏗️ Phase-Wise Architecture Breakdown

### Phase 1: Data Ingestion (`phase1_ingestion`)
**Purpose:** Scrape external live mutual fund data from Groww.
- **Technology:** Python, Playwright, BeautifulSoup
- **Operation:** Evaluates dynamic DOM elements (like fund managers) cleanly, parsing raw HTML to structured dictionaries.
- **Output:** `raw_funds.json` containing scraped meta-data.

### Phase 2: Knowledge Processing (`phase2_processing`)
**Purpose:** Transform raw scraping objects into RAG-optimized granular knowledge chunks.
- **Technology:** Python, JSON
- **Operation:** Breaks down complex hierarchical data (Holdings, Sectors, Returns, Overview) into small semantic chunks ideal for semantic similarity queries. Augments context dynamically (e.g., adding localized attributes like *Fund Managers*).
- **Output:** `rag_chunks.jsonl` containing normalized document chunks.

### Phase 3: Text Embeddings & Vector Store (`phase3_embeddings`)
**Purpose:** Convert plain text chunks into numerical vectors and index them.
- **Technology:** Google GenAI (`gemini-embedding-001`), ChromaDB, NumPy
- **Operation:** Generates high-dimensional vector representations of chunks. Saves them locally and indexes them. Contains a robust fallback architecture to bypass incompatible low-level OS executions using Python-native NumPy arrays.
- **Output:** `embeddings.json` and a hydrated persistent `chroma_db` directory (or NumPy equivalent file mappings).

### Phase 4: Prompt Engineering & Retrieval Engine (`phase4_rag_pipeline`)
**Purpose:** Handle the core RAG logic (Retrieval + Augmentation + Generation).
- **Technology:** Google GenAI LLMs, NumPy/ChromaDB similarity querying.
- **Operation:** Calculates spatial cosine similarity between the embedded user-query and the knowledge base. Injects top K matches via a carefully crafted system prompt into the completion stream. Extrapolates source URLs intelligently.
- **Output:** Python RAG interface executing queries and returning structured string outputs with mapped citations.

### Phase 5: Backend API Service (`phase5_backend`)
**Purpose:** Provide web access and guardrails over the backend RAG capability.
- **Technology:** FastAPI, Uvicorn, Pydantic
- **Operation:** Serves REST endpoints (`POST /api/chat`). Features validation logic (Guardrails) bypassing backend execution for malicious or wildly out-of-domain queries, ensuring system integrity and latency preservation.
- **Output:** Running async webserver resolving client JSON requests into RAG responses.

### Phase 6: Frontend UI Application (`phase6_ui`)
**Purpose:** Interactive visual wrapper consuming the intelligence.
- **Technology:** React, Vite, Tailwind CSS
- **Operation:** Provides a fully responsive Dashboard mapping to REST APIs. Blends conversational user AI inputs directly with structured UI interfaces (Collapsible Accordion Fund Explorers, Navigation Cards, Charts, Dynamic Themes, etc). 
- **Output:** Compiled static web files (`npm run build`) deployed and active globally on client browsers.

### Phase 7: Automated Lifecycle Scheduler (`phase7_scheduler`)
**Purpose:** Keep vector knowledge universally synchronized without human monitoring.
- **Technology:** APScheduler (Python)
- **Operation:** Bootstraps chron-jobs (`22:30 IST`) tracking `phase1_scraper` -> `phase2_processor` -> `phase3_embedder` -> `phase3_vector_store` automatically, refreshing `phase5` references. Logs all actions reliably.
- **Output:** `scheduler_cron.log` guaranteeing fully autonomous updates.

---

## 🛠️ Tech Stack & Workflow

- **Infrastructure:** Local Windows SQLite file mapping.
- **Frontend Engine:** Vite / React
- **Compute Layer:** Google Generative AI Cloud (Embeddings & Completions)
- **Deployment & Flow:** Playwright -> Transformers -> Embeddings Indexing -> RestAPI -> User Interfaces.
