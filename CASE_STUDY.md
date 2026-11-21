# Case Study: HDFC Mutual Fund Assistant

## 1. Context and problem
Retail investors researching mutual funds juggle factsheets, AMC sites and aggregator pages. When they turn to a general chatbot, two things go wrong: numbers like NAV and expense ratio can be wrong, and the bot may slip into advice ("buy this fund"). In a financial product, a confidently wrong number or an unlicensed recommendation destroys trust.

**Hypothesis:** an assistant that answers only from a curated, cited knowledge base, and refuses advice, can make fund research faster without the trust problems of a general chatbot.

## 2. Users
| Persona | Need | Job to be done |
|---|---|---|
| First-time investor, 22-35 | Quick, trustworthy facts while choosing a SIP | "Tell me this fund's expense ratio and minimum SIP so I can shortlist" |
| Support or sales analyst at a wealth platform | Fast, accurate scheme answers | "Answer a customer's exit-load question in seconds, with a source" |

## 3. Scope and trade-offs
| Decision | Why | Cost |
|---|---|---|
| 5 AMCs, 26 Direct Growth schemes (HDFC, ICICI Prudential, SBI, Axis, Bandhan) | Started with 5 HDFC schemes to validate accuracy & guardrails, then scaled the ingestion pipeline to 26 schemes across 5 AMCs | Unsupported AMCs (e.g. Nippon, PPFAS) are explicitly refused in guardrails |
| Dashboard plus chat, not chat only | Users scan known metrics visually and use chat for long-tail questions | More surface area to build |
| Guardrails refuse advice and non-HDFC queries | Compliance and trust matter more than answering everything | Some legitimate edge cases are refused |
| Compare view with no "winner" | Meets the real need (side-by-side) without advising | Users who want a verdict are not served |
| Mutual funds only, no stocks | Different data, risk and freshness needs | Narrower appeal |
| Switched generation from Groq to Gemini | Groq model returned 404 (access), and one provider simplifies keys; added a fallback model for rate limits | Dependence on one vendor; free-tier quota limits |

**Non-goals:** personalised recommendations, ranking funds, trade execution.

## 4. What was built
- RAG pipeline: scrape, clean and chunk, hybrid structured KB + vector retrieval, generate a grounded answer with a source link and instant deterministic KB fallback on rate limits.
- Guardrails and dynamic AMC/category normalisation ("icici flexi cap ka nav", "sbi midcap").
- Workspace: dashboard with charts, multi-AMC fund explorer, side-by-side compare + **Portfolio Overlap Analyzer** + CSV export, SIP and fee-drag calculator, chat with follow-up memory and thumbs feedback.
- Product analytics: SQLite logs latency, outcome, engine split, entry-point funnel, AMC demand, feature events, and surfaces the Golden Eval Scorecard in-app.

## 5. How success is measured
| Layer | Metric | Where it comes from |
|---|---|---|
| North star | Share of answers that are cited and rated helpful | Analytics tab (cited-answer rate, helpful rate) |
| Engagement | Queries per session, quick-fact vs free-text, saves | Query log (instrumented) |
| Quality | Benchmark accuracy, no-answer rate, P95 latency | `eval/run_eval.py`, analytics tab |
| Safety | Advice and out-of-scope block rate | Eval set, analytics tab |
| Content gaps | Top unanswered questions | Analytics tab, feeds the backlog |

## 6. Evaluation
A 16-case benchmark (`eval/run_eval.py`; full output in `eval/RESULTS.md`). Expected values are read from the scraped data, so ground truth is not hand-typed.

| Category | Result |
|---|---|
| Factual (NAV, expense ratio, minimum SIP) | 6/6 |
| Alias / messy wording | 4/4 |
| Guardrails (advice, non-HDFC) | 6/6 |

**Honest read:** 16 cases is a smoke test, not proof of production quality. It covers three attributes and well-formed phrasing. The next step is to widen it (holdings, exit load, fund managers, multi-fund and typo queries) and to track thumbs-down feedback from real users.

## 7. Learnings
- **Silent failures:** the original chatbot returned a generic error for every question. The cause was an unavailable model, hidden by a catch-all error message. Logging outcomes and surfacing rate-limit errors makes this class of problem visible.
- **Query rewriting bug:** the original normaliser turned "HDFC Balanced Advantage Fund" into "HDFC HDFC Balanced Advantage Fund Direct Growth Fund". Fixed, and the alias tests now guard it.
- **Rate limits are a product risk:** the free tier returned 429 during testing. A fallback model and a friendly message keep the experience usable.

## 8. Risks and next steps
| Risk | Mitigation / next step |
|---|---|
| Stale data | Show last sync and NAV date (done); alert when the scheduler fails |
| Wrong or missing answers | Review thumbs-down and unanswered queries weekly; expand the eval set |
| Regulatory exposure | Disclaimers (done); legal review before any real launch |
| Limited coverage | Add 1-2 more AMCs so comparison works across houses |
| Cost and quota | Cache frequent answers; move off free tier before launch |

## 9. What I would do with real users
Recruit 5-8 investors, watch them research a fund with and without the tool, and measure time to find a fact and trust in the answer. Use those sessions to decide whether to prioritise more funds, holdings depth or portfolio-level questions.
