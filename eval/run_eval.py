"""Golden evaluation set for the Multi-AMC Mutual Fund RAG assistant (26 schemes, 5 AMCs).

Factual ground truth is derived directly from phase1_ingestion/output/raw_funds.json,
so the benchmark stays accurate whenever the data is refreshed.

Run from the project root:  python eval/run_eval.py
Outputs: eval/results.json and eval/RESULTS.md
"""
import json
import os
import re
import sys
import time
import warnings

warnings.filterwarnings("ignore")
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

from phase5_backend.guardrails import validate_query  # noqa: E402
from phase5_backend.rag_service import RAGService  # noqa: E402

with open(os.path.join(ROOT, "phase1_ingestion", "output", "raw_funds.json"), encoding="utf-8") as f:
    FUNDS = {d["fund_name"]: d for d in json.load(f)}


def num(v):
    m = re.search(r"\d[\d,]*\.?\d*", str(v))
    return m.group(0).replace(",", "") if m else str(v)


def _pick(prefix, keyword):
    for name in FUNDS:
        if name.lower().startswith(prefix) and keyword in name.lower():
            return name
    return None


def build_cases():
    cases = []

    # 1) Factual across all 5 AMCs (NAV, expense ratio, minimum SIP, fund manager)
    factual_targets = [
        ("hdfc", "balanced advantage", "nav", "NAV"),
        ("hdfc", "mid cap", "expense_ratio", "expense ratio"),
        ("icici", "mid cap", "nav", "NAV"),
        ("icici", "small cap", "expense_ratio", "expense ratio"),
        ("sbi", "small cap", "expense_ratio", "expense ratio"),
        ("sbi", "large cap", "nav", "NAV"),
        ("axis", "flexi cap", "nav", "NAV"),
        ("axis", "midcap", "minimum_sip", "minimum SIP"),
        ("bandhan", "small cap", "expense_ratio", "expense ratio"),
        ("bandhan", "multi cap", "nav", "NAV"),
    ]
    for prefix, kw, field, label in factual_targets:
        fname = _pick(prefix, kw)
        if fname:
            cases.append({
                "category": "factual",
                "query": f"What is the {label} of {fname}?",
                "expect_contains": num(FUNDS[fname][field]),
                "expect_blocked": False,
            })

    # 2) Holdings & Manager lookups
    axis_flexi = _pick("axis", "flexi cap")
    if axis_flexi and FUNDS[axis_flexi].get("holdings"):
        top_company = FUNDS[axis_flexi]["holdings"][0]["company_name"].split()[0]
        cases.append({
            "category": "holdings",
            "query": f"What are the top holdings of {axis_flexi}?",
            "expect_contains": top_company,
            "expect_blocked": False,
        })
    bandhan_multi = _pick("bandhan", "multi cap")
    if bandhan_multi and FUNDS[bandhan_multi].get("fund_managers"):
        mgr = FUNDS[bandhan_multi]["fund_managers"].split(",")[0].strip()
        cases.append({
            "category": "holdings",
            "query": f"Who manages {bandhan_multi}?",
            "expect_contains": mgr,
            "expect_blocked": False,
        })

    # 3) Alias / Hinglish / indirect queries
    alias_queries = [
        ("hdfc balanced advantage", _pick("hdfc", "balanced advantage"), "expense_ratio", "expense ratio of hdfc balanced advantage fund"),
        ("icici flexi", _pick("icici", "flexi cap"), "nav", "icici flexi cap ka nav kya hai?"),
        ("sbi midcap", _pick("sbi", "mid cap"), "expense_ratio", "sbi mid cap expense ratio batao"),
        ("axis smallcap", _pick("axis", "small cap"), "nav", "axis smallcap fund nav"),
        ("bandhan large", _pick("bandhan", "large cap"), "expense_ratio", "bandhan large cap expense ratio"),
    ]
    for _, fname, field, q in alias_queries:
        if fname:
            cases.append({
                "category": "alias",
                "query": q,
                "expect_contains": num(FUNDS[fname][field]),
                "expect_blocked": False,
            })

    # 4) Guardrails: advice-seeking and unsupported AMCs
    for q in [
        "Should I invest in HDFC Mid Cap Fund?",
        "Which fund is best for me?",
        "Can you recommend a good scheme?",
        "Should I buy or sell SBI Small Cap?",
        "What is the NAV of Nippon India Small Cap Fund?",
        "Tell me Parag Parikh Flexi Cap expense ratio",
        "What is the expense ratio of Kotak Emerging Equity Fund?",
    ]:
        cases.append({"category": "blocked", "query": q, "expect_contains": None, "expect_blocked": True})

    return cases


def main():
    cases = build_cases()
    service = RAGService()
    results = []
    for c in cases:
        started = time.perf_counter()
        validation = validate_query(c["query"])
        blocked = not validation["valid"]
        answer, sources = (validation["rejection_message"], []) if blocked else ("", [])
        if not blocked:
            out = service.ask(c["query"])
            answer, sources = out["answer"], out["sources"]

        if c["expect_blocked"]:
            passed = blocked
        else:
            passed = (
                (not blocked)
                and c["expect_contains"].lower() in answer.replace(",", "").lower()
                and len(sources) > 0
            )
        results.append({
            **c,
            "answer": answer,
            "sources": sources,
            "blocked": blocked,
            "passed": passed,
            "latency_ms": int((time.perf_counter() - started) * 1000),
        })
        print(("PASS " if passed else "FAIL ") + c["category"].ljust(9) + c["query"])

    summary = {}
    for cat in ("factual", "holdings", "alias", "blocked"):
        rows = [r for r in results if r["category"] == cat]
        if rows:
            summary[cat] = {"passed": sum(r["passed"] for r in rows), "total": len(rows)}
    total_pass = sum(r["passed"] for r in results)
    lat = sorted(r["latency_ms"] for r in results if not r["blocked"])

    out_dir = os.path.dirname(__file__)
    with open(os.path.join(out_dir, "results.json"), "w", encoding="utf-8") as f:
        json.dump({"summary": summary, "results": results}, f, indent=2, ensure_ascii=False)

    lines = [
        "# Evaluation Results (Multi-AMC: 26 Schemes, 5 AMCs)", "",
        f"**Overall: {total_pass}/{len(results)} passed ({100 * total_pass // len(results)}%)**", "",
        "| Category | Passed | What it tests |", "|---|---|---|",
        f"| Factual | {summary['factual']['passed']}/{summary['factual']['total']} | Exact NAV / expense ratio / SIP across all 5 AMCs + source link |",
        f"| Holdings & Managers | {summary['holdings']['passed']}/{summary['holdings']['total']} | Portfolio holdings & fund manager accuracy |",
        f"| Alias / Hinglish | {summary['alias']['passed']}/{summary['alias']['total']} | Casual / Hinglish scheme names mapped accurately |",
        f"| Guardrails | {summary['blocked']['passed']}/{summary['blocked']['total']} | Advice-seeking and unsupported AMCs refused |", "",
        f"Median RAG latency: {lat[len(lat) // 2] if lat else 0} ms", "",
        "## Failures", "",
    ]
    fails = [r for r in results if not r["passed"]]
    lines += [f"- `{r['query']}` -> {r['answer'][:160]!r}" for r in fails] or ["None"]
    with open(os.path.join(out_dir, "RESULTS.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"\nOverall {total_pass}/{len(results)}  {summary}")


if __name__ == "__main__":
    main()
