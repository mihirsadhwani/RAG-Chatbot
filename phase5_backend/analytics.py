"""Product & AI-quality analytics for the Mutual Fund RAG assistant (SQLite)."""
import os
import sqlite3
import threading
from datetime import datetime, timezone

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "analytics.db")
_lock = threading.Lock()

NO_INFO_MARKER = "couldn't find that information"


def _conn():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with _lock, _conn() as c:
        c.execute(
            """CREATE TABLE IF NOT EXISTS queries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT NOT NULL,
                query TEXT NOT NULL,
                fund TEXT,
                amc TEXT,
                latency_ms INTEGER,
                top_score REAL,
                outcome TEXT NOT NULL,
                engine TEXT,
                source_ui TEXT,
                source_count INTEGER DEFAULT 0,
                feedback INTEGER
            )"""
        )
        # Safe migration for existing databases
        existing = {r["name"] for r in c.execute("PRAGMA table_info(queries)")}
        for col, typ in [("amc", "TEXT"), ("engine", "TEXT"), ("source_ui", "TEXT")]:
            if col not in existing:
                c.execute(f"ALTER TABLE queries ADD COLUMN {col} {typ}")

        c.execute(
            """CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT NOT NULL,
                event_name TEXT NOT NULL,
                detail TEXT
            )"""
        )


def _infer_amc(fund: str | None, query: str) -> str | None:
    text = f"{fund or ''} {query or ''}".lower()
    for amc, label in [
        ("hdfc", "HDFC"),
        ("icici", "ICICI Prudential"),
        ("sbi", "SBI"),
        ("axis", "Axis"),
        ("bandhan", "Bandhan"),
        ("idfc", "Bandhan"),
    ]:
        if amc in text:
            return label
    return None


def log_query(
    query,
    fund,
    latency_ms,
    top_score,
    outcome,
    source_count=0,
    engine=None,
    source_ui=None,
):
    amc = _infer_amc(fund, query)
    with _lock, _conn() as c:
        cur = c.execute(
            "INSERT INTO queries (ts, query, fund, amc, latency_ms, top_score, outcome, engine, source_ui, source_count) "
            "VALUES (?,?,?,?,?,?,?,?,?,?)",
            (
                datetime.now(timezone.utc).isoformat(),
                query,
                fund,
                amc,
                latency_ms,
                top_score,
                outcome,
                engine,
                source_ui or "chat_input",
                source_count,
            ),
        )
        return cur.lastrowid


def log_event(event_name: str, detail: str | None = None):
    with _lock, _conn() as c:
        c.execute(
            "INSERT INTO events (ts, event_name, detail) VALUES (?,?,?)",
            (datetime.now(timezone.utc).isoformat(), event_name, detail),
        )


def set_feedback(query_id, value):
    with _lock, _conn() as c:
        cur = c.execute("UPDATE queries SET feedback=? WHERE id=?", (value, query_id))
        return cur.rowcount > 0


def classify_outcome(answer: str, sources: list) -> str:
    if NO_INFO_MARKER in answer.lower():
        return "no_info"
    if answer.lower().startswith("sorry"):
        return "error"
    return "answered" if sources else "greeting"


def summary():
    with _lock, _conn() as c:
        rows = [dict(r) for r in c.execute("SELECT * FROM queries ORDER BY id DESC")]
        ev_rows = [dict(r) for r in c.execute("SELECT event_name, COUNT(*) as cnt FROM events GROUP BY event_name")]

    events = {r["event_name"]: r["cnt"] for r in ev_rows}
    total = len(rows)
    if total == 0:
        return {
            "total_queries": 0, "avg_latency_ms": 0, "p95_latency_ms": 0,
            "blocked_rate": 0, "no_info_rate": 0, "error_rate": 0,
            "cited_answer_rate": 0, "feedback_count": 0, "positive_feedback_rate": None,
            "outcomes": {}, "engines": {}, "entry_points": {}, "amc_demand": [],
            "events": events, "top_funds": [], "unanswered": [], "recent": [],
        }

    lat = sorted(r["latency_ms"] for r in rows if r["latency_ms"] is not None)
    p95 = lat[min(len(lat) - 1, int(len(lat) * 0.95))] if lat else 0
    outcomes, engines, entry_points, amc_counts, fund_counts = {}, {}, {}, {}, {}

    for r in rows:
        outcomes[r["outcome"]] = outcomes.get(r["outcome"], 0) + 1
        if r.get("engine"):
            engines[r["engine"]] = engines.get(r["engine"], 0) + 1
        if r.get("source_ui"):
            entry_points[r["source_ui"]] = entry_points.get(r["source_ui"], 0) + 1
        if r.get("amc"):
            amc_counts[r["amc"]] = amc_counts.get(r["amc"], 0) + 1
        if r.get("fund"):
            fund_counts[r["fund"]] = fund_counts.get(r["fund"], 0) + 1

    rated = [r for r in rows if r["feedback"] is not None]
    positive = sum(1 for r in rated if r["feedback"] == 1)

    top_funds = sorted(fund_counts.items(), key=lambda x: -x[1])[:5]
    amc_demand = sorted(amc_counts.items(), key=lambda x: -x[1])

    unanswered = [
        {"query": r["query"], "outcome": r["outcome"]}
        for r in rows if r["outcome"] in ("no_info", "error")
    ][:8]

    pct = lambda n: round(100 * n / total, 1)
    return {
        "total_queries": total,
        "avg_latency_ms": round(sum(lat) / len(lat)) if lat else 0,
        "p95_latency_ms": p95,
        "blocked_rate": pct(outcomes.get("blocked", 0)),
        "no_info_rate": pct(outcomes.get("no_info", 0)),
        "error_rate": pct(outcomes.get("error", 0)),
        "cited_answer_rate": pct(outcomes.get("answered", 0)),
        "feedback_count": len(rated),
        "positive_feedback_rate": round(100 * positive / len(rated), 1) if rated else None,
        "outcomes": outcomes,
        "engines": engines,
        "entry_points": entry_points,
        "amc_demand": [{"amc": a, "count": n} for a, n in amc_demand],
        "events": events,
        "top_funds": [{"fund": f, "count": n} for f, n in top_funds],
        "unanswered": unanswered,
        "recent": [
            {
                "ts": r["ts"], "query": r["query"], "outcome": r["outcome"],
                "engine": r.get("engine"), "source_ui": r.get("source_ui"),
                "latency_ms": r["latency_ms"], "feedback": r["feedback"],
            }
            for r in rows[:12]
        ],
    }
