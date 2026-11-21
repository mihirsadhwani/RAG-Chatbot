# Mutual Fund RAG Intelligence Dashboard

A source-cited AI research assistant and analytics workspace covering **26 mutual fund schemes across 5 AMCs** (HDFC, ICICI Prudential, SBI, Axis, Bandhan). Answers factual questions (NAV, expense ratio, SIP minimum, exit load, holdings, returns) with zero hallucinations and without giving investment advice.

> Information only, not investment advice. Data is scraped from public Groww scheme pages and refreshed on a schedule.

## The problem

- Fund facts are scattered across factsheets, AMC sites and aggregators, so finding one number takes minutes.
- General chatbots state NAVs and expense ratios confidently and sometimes wrongly. They also drift into "you should buy this", which is a trust and compliance risk in finance.
- Dashboards show data but cannot answer long-tail questions such as "what is the exit load if I redeem after 8 months?" or "which funds hold Coforge?"

**Primary user:** a first-time retail investor (22–35) researching SIPs and comparing funds across AMCs.
**Secondary user:** a support, wealth, or business analyst who needs fast, accurate, exportable scheme data.

## How the product solves it

| Problem | Solution |
|---|---|
| Hallucinated numbers | Hybrid RAG + structured knowledge base over 26 scraped Groww schemes; every answer carries a source link |
| Risky advice | Guardrails refuse advice-seeking and unsupported AMCs |
| False diversification | **Portfolio Overlap Analyzer** computes shared stocks & weight overlap across any 2–3 funds |
| Casual / Hinglish wording | Dynamic AMC + category detection and query normalisation |
| "Can we trust the AI?" | **AI Analytics**: latency, outcome mix, engine split, entry-point funnel, thumbs feedback, and in-app Golden Eval Scorecard |

## Features

- **AI Chat Assistant** with Groww citations, conversation history follow-ups, copy/save, and thumbs up/down feedback
- **Overview Dashboard** with KPI cards, annualised returns comparison chart, and top sector allocation
- **Multi-AMC Fund Explorer** with AMC filter pills (HDFC, ICICI, SBI, Axis, Bandhan) and detailed attributes
- **Compare Schemes & Portfolio Overlap**: factual side-by-side metric table (no "winner") + shared-holdings overlap calculator + **Export CSV**
- **SIP & Expense-Ratio Calculator** with projected growth and fee drag
- **AI Analytics**: total queries, cited-answer rate, helpful rate, avg/P95 latency, engine split, entry-point funnel, AMC demand, data freshness, Golden Eval Scorecard, and **Export CSV**
- **Evaluation Harness** (`eval/run_eval.py`): 24-case multi-AMC benchmark (factual, holdings, Hinglish/alias, guardrails). See [eval/RESULTS.md](eval/RESULTS.md) and the [case study](CASE_STUDY.md)

## Run locally

```bash
pip install -r requirements.txt
# .env in project root (never commit it):
#   GEMINI_API_KEY=your_key
python -m uvicorn phase5_backend.main:app --port 8001

cd phase6_ui && npm install && npm run dev      # http://localhost:5173
python eval/run_eval.py                          # regenerate benchmark results
```
