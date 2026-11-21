# Mutual Fund RAG Intelligence Dashboard - System Architecture

This document outlines the end-to-end system architecture of the Multi-AMC Mutual Fund RAG Intelligence Dashboard. The system is built using a modular phase-wise architecture where ingestion, processing, hybrid retrieval/generation, product analytics, evaluation, and the frontend dashboard operate cleanly via file checkpoints and REST APIs.

---

## Phase-Wise Architecture Breakdown

### Phase 1: Data Ingestion (`phase1_ingestion`)
**Purpose:** Scrape live mutual fund scheme data from Groww across 5 AMCs.
- **Technology:** Python, Playwright (`phase1_scraper.py`)
- **Coverage:** **26 Direct Growth schemes** across **5 AMCs** (`HDFC` [6], `ICICI Prudential` [5], `SBI` [5], `Axis` [5], `Bandhan / IDFC` [5]) defined in `phase1_urls.json`.
- **Operation:** Launches headless Chromium, triggers lazy-loaded return and portfolio sections, and extracts NAV, NAV date, expense ratio, minimum SIP, AUM, risk level, fund managers, historical & annualised returns, category benchmarks/ranks, equity & debt sector allocations, portfolio composition, exit loads, stamp duty, tax rules, and full holdings.
- **Output:** `phase1_ingestion/output/raw_funds.json` (also synced to `phase6_ui/public/fund_data.json` as a static fallback).

### Phase 2: Knowledge Processing (`phase2_processing`)
**Purpose:** Transform raw scheme objects into RAG-optimized granular knowledge chunks.
- **Technology:** Python, JSON
- **Operation:** Breaks down hierarchical fund data (Overview, Returns, Sectors, Holdings, Fund Managers) into normalized semantic chunks.
- **Output:** `phase2_processing/output/rag_chunks.jsonl`

### Phase 3: Text Embeddings & Vector Store (`phase3_embeddings`)
**Purpose:** Convert text chunks into vector embeddings and index them locally.
- **Technology:** Google GenAI (`models/gemini-embedding-001`), ChromaDB, NumPy
- **Output:** `phase3_embeddings/output/embeddings.json` and `chroma_db/`.

### Phase 4: Core RAG Pipeline (`phase4_rag_pipeline`)
**Purpose:** Standalone retrieval and generation prototypes used during initial pipeline validation.

### Phase 5: Backend API, Hybrid KB Engine & Product Analytics (`phase5_backend`)
**Purpose:** Serve fast, guardrail-protected, source-cited answers and product/AI analytics over REST.
- **Technology:** FastAPI, Uvicorn, Pydantic, Requests (REST), SQLite (`analytics.db`)
- **Key Modules:**
  - `knowledge_base.py`: Builds a compact Master Summary Table across all 26 schemes + detailed dossiers for targeted funds, performs cross-fund stock/company holding search, supports dynamic AMC + category detection (English, Hinglish, typos, multi-fund comparisons, and conversation history), auto-reloads `raw_funds.json` on file modification (`mtime`), and provides an instant (`<15ms`) deterministic KB fallback engine.
  - `guardrails.py`: Blocks subjective investment advice ("Should I invest?", "Recommend a fund") while allowing factual metric comparisons; blocks unsupported AMCs outside the 5 indexed fund houses while allowing stock-holding queries (e.g., SBI/ICICI/Kotak/Tata shares inside portfolios).
  - `rag_service.py`: Combines local fast chunk scoring with direct HTTPS REST calls to Google Gemini (`gemini-3-flash-preview` -> `gemini-flash-lite-latest`) with strict 2.5s timeouts, 429/timeout cooldown tracking, and automatic fallback to the deterministic KB engine.
  - `analytics.py`: SQLite-backed product & AI telemetry (`phase5_backend/data/analytics.db`) logging `queries` (latency, outcome, engine split, entry-point `source_ui`, inferred AMC, and thumbs up/down feedback) and `events` (feature interactions such as `overlap_check`, `csv_export`, `copy_answer`, `save_query`, `source_click`).
- **REST Endpoints (`api_routes.py`):**
  - `GET /health` — Backend health check
  - `GET /api/funds` — Live 26-scheme knowledge base JSON
  - `GET /api/status` — Indexed fund/chunk counts, latest NAV date, last data sync timestamp, and active generator chain
  - `POST /api/chat` — Guardrail-checked hybrid RAG query endpoint (accepts `query`, `fund`, `history`, `source_ui`)
  - `POST /api/feedback` — Records thumbs-up/thumbs-down (`1` / `-1`) per `query_id`
  - `POST /api/event` — Records product funnel & feature-adoption events
  - `GET /api/analytics` — Aggregated KPIs, P95 latency, outcome breakdown, engine split, entry-point funnel, AMC demand, and recent queries
  - `GET /api/eval` — Serves the latest Golden Eval benchmark scorecard

### Phase 6: Frontend Dashboard Application (`phase6_ui`)
**Purpose:** Complete financial analytics & AI research workspace.
- **Technology:** React 19, Vite 7, Tailwind CSS v4, shadcn/ui primitives (`@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`), `lucide-react` icons (zero emojis), `recharts`
- **Views & Features:**
  - **Professional Collapsible Sidebar (`Sidebar.jsx`)**: Grouped navigation (`Workspace`, `Tools`, `Resources`), live `Gemini RAG Active` status, and scheme/saved counts.
  - **Overview Dashboard (`OverviewDashboard.jsx`)**: Quick-Ask AI bar, 4 KPI cards, 3Y/5Y/10Y Annualised Returns bar chart, Top Sector Allocation donut chart, and interactive scheme cards.
  - **AI Chat Assistant (`ChatPanel.jsx`, `QueryDropdown.jsx`, `SourceCard.jsx`)**: Dynamic 26-fund Quick Fact Builder, suggested prompts, multi-turn conversation history, Groww source pills, copy/save actions, and thumbs up/down feedback.
  - **Mutual Funds Explorer (`MutualFundsList.jsx`) & Right Inspector (`FundInfoPanel.jsx`, `AttributeTabs.jsx`)**: AMC filter pills (`All`, `HDFC`, `ICICI`, `SBI`, `Axis`, `Bandhan`), search filter, and tabbed metric/holdings/sector/tax inspector.
  - **Compare Schemes & Portfolio Overlap (`ComparePanel.jsx`)**: Factual side-by-side metric comparison (deliberately no "winner"), live **Portfolio Stock Overlap Analyzer** (pairwise weight overlap %, shared companies, combined unique stocks), and 1-click **Export CSV**.
  - **SIP & Expense Ratio Calculator (`SipCalculator.jsx`)**: Illustrative SIP growth projection and expense-ratio fee-drag visualization.
  - **AI Quality & Product Analytics (`AnalyticsPanel.jsx`)**: Live KPIs, in-app **Golden Eval Scorecard**, Engine Split & AMC Demand, Entry-Point Funnel & Feature Events, Safety & Unanswered Backlog, Data Freshness, and **Export CSV**.
  - **Quick Facts, Saved Queries, Documentation (`QuickFacts.jsx`, `SavedQueries.jsx`, `Documentation.jsx`)**.

### Phase 7: Automated Lifecycle Scheduler (`phase7_scheduler`)
**Purpose:** Keep the knowledge base synchronized on a daily schedule.
- **Technology:** APScheduler (Python)
- **Operation:** Runs daily at `22:30 IST` (`Asia/Kolkata`) or on-demand via `python phase7_scheduler/scheduler.py --run-now`, executing `phase1_scraper.py` -> `phase2_processor.py` -> `phase3_embedder.py` -> `phase3_vector_store.py`. `knowledge_base.py` automatically detects `raw_funds.json` file updates via `mtime` with zero downtime.

### Evaluation Harness (`eval`)
**Purpose:** Automated regression benchmark for factual accuracy, holdings/managers, Hinglish/alias handling, and guardrail compliance.
- **Script:** `eval/run_eval.py` (derives ground truth dynamically from `raw_funds.json`)
- **Outputs:** `eval/results.json` and `eval/RESULTS.md` (currently **24/24 passed / 100%** across all 5 AMCs).

---

## Tech Stack & Data Flow

- **Frontend:** React 19, Vite, Tailwind CSS v4, shadcn/ui (Radix), Recharts, Lucide Icons
- **Backend:** FastAPI, Uvicorn, Pydantic, SQLite (`analytics.db`)
- **AI / Retrieval:** Google Gemini REST (`gemini-3-flash-preview`, `gemini-flash-lite-latest`), `gemini-embedding-001`, Structured KB + Deterministic Fallback
- **End-to-End Flow:** `Playwright (Groww) -> raw_funds.json -> Hybrid KB + Gemini REST -> FastAPI + SQLite Analytics -> React + shadcn/ui Dashboard`
