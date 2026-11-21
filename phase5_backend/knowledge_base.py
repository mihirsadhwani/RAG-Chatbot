"""Complete structured knowledge base built dynamically from phase1_ingestion/output/raw_funds.json.

Supports all 26 schemes across 5 AMCs (HDFC, ICICI Prudential, SBI, Axis, Bandhan/IDFC):
1. Dynamic AMC + Category fund detection (handles typos, Hinglish, multi-fund comparisons, and history).
2. Cross-fund holding search across all schemes in raw_funds.json.
3. Compact Master Table (all 26 schemes) + Full Dossiers for targeted funds.
4. Dynamic deterministic fallback engine for instant (<15ms) factual & analytical answers.
"""
import difflib
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW_PATH = os.path.join(ROOT, "phase1_ingestion", "output", "raw_funds.json")

AMC_PATTERNS = {
    "hdfc": [r"\bhdfc\b"],
    "icici": [r"\bicici\b", r"\bicici\s+prudential\b", r"\bipru\b"],
    "sbi": [r"\bsbi\b"],
    "axis": [r"\baxis\b"],
    "bandhan": [r"\bbandhan\b", r"\bidfc\b"],
}

CATEGORY_PATTERNS = {
    "balanced_advantage": [r"\bbalanced\s+advantage\b", r"\bbalanced\b", r"\badvantage\b", r"\bbaf\b", r"\bdynamic\s+asset\b", r"\bhybrid\b"],
    "multi_cap": [r"\bmulti\s*-?\s*cap\b", r"\bmulticap\b"],
    "flexi_cap": [r"\bflexi\s*-?\s*cap\b", r"\bflexicap\b", r"\bflexy\b", r"\bhdfc\s+equity\b", r"\bidfc\s+premier\b"],
    "mid_cap": [r"\bmid\s*-?\s*cap\b", r"\bmidcap\b", r"\bmiddle\s+cap\b", r"\bmid\s+kap\b"],
    "large_cap": [r"\blarge\s*-?\s*cap\b", r"\blargecap\b", r"\btop\s*100\b", r"\bblue\s*-?\s*chip\b"],
    "small_cap": [r"\bsmall\s*-?\s*cap\b", r"\bsmallcap\b", r"\bsmal\s+cap\b"],
}

FUZZY_CAT_TOKENS = {
    "balanced": "balanced_advantage",
    "advantage": "balanced_advantage",
    "multicap": "multi_cap",
    "flexicap": "flexi_cap",
    "midcap": "mid_cap",
    "largecap": "large_cap",
    "smallcap": "small_cap",
    "bluechip": "large_cap",
}

COMPANY_ALIASES = {
    "sbi": "state bank of india",
    "state bank": "state bank of india",
    "icici": "icici bank",
    "hdfc bank": "hdfc bank",
    "axis": "axis bank",
    "kotak": "kotak mahindra bank",
    "airtel": "bharti airtel",
    "bharti": "bharti airtel",
    "infosys": "infosys",
    "infy": "infosys",
    "tcs": "tata consultancy",
    "ril": "reliance industries",
    "reliance": "reliance industries",
    "l&t": "larsen & toubro",
    "larsen": "larsen & toubro",
    "maruti": "maruti suzuki",
    "ntpc": "ntpc",
    "coal india": "coal india",
    "sun pharma": "sun pharmaceutical",
    "itc": "itc",
    "federal bank": "federal bank",
    "au bank": "au small finance bank",
    "max financial": "max financial",
    "coforge": "coforge",
    "persistent": "persistent systems",
    "fortis": "fortis healthcare",
    "glenmark": "glenmark",
    "ipca": "ipca laboratories",
    "balkrishna": "balkrishna industries",
    "apollo tyres": "apollo tyres",
    "cummins": "cummins india",
    "hpcl": "hindustan petroleum",
    "bpcl": "bharat petroleum",
    "ongc": "oil & natural gas",
    "goi": "goi",
    "sovereign": "goi",
    "firstsource": "firstsource",
}

ALL_FUNDS_HINTS = [
    "all funds", "all schemes", "every fund", "each fund", "all 26", "all 25",
    "sabhi", "sab funds", "sare", "saare", "dono", "teeno",
    "compare", "comparison", "versus", " vs ", "difference", "farak", "antar",
    "which fund", "which scheme", "kaunsa", "kaun sa", "kaun si", "konsa", "konsi",
    "kis fund", "kis scheme", "kisme", "kismein", "sabse", "highest", "lowest",
    "cheapest", "costliest", "expensive", "largest", "smallest", "biggest",
    "most ", "least ", "maximum", "minimum among", "ranking", "rank", "common",
    "kitne fund", "how many funds", "list all",
]

UNSUPPORTED_METRIC_WORDS = [
    "sharpe", "sortino", "treynor", "alpha", "beta", "standard deviation",
    "p/e", "pe ratio", "p/b", "pb ratio", "dividend yield", "turnover ratio",
    "tracking error", "isin", "amfi code", "phone number", "customer care",
]

_FUNDS = None
_FUNDS_MTIME = None


def load_funds() -> dict:
    global _FUNDS, _FUNDS_MTIME
    mtime = os.path.getmtime(RAW_PATH) if os.path.exists(RAW_PATH) else None
    if _FUNDS is None or (mtime is not None and mtime != _FUNDS_MTIME):
        with open(RAW_PATH, "r", encoding="utf-8") as f:
            _FUNDS = {d["fund_name"]: d for d in json.load(f)}
        _FUNDS_MTIME = mtime
    return _FUNDS


def short_name(name: str) -> str:
    return name.replace(" Direct Plan Growth", "").replace(" Direct Growth", "")


def _fund_amc(name: str) -> str:
    n = name.lower()
    if n.startswith("hdfc"):
        return "hdfc"
    if n.startswith("icici"):
        return "icici"
    if n.startswith("sbi"):
        return "sbi"
    if n.startswith("axis"):
        return "axis"
    if n.startswith("bandhan") or n.startswith("idfc"):
        return "bandhan"
    return "other"


def _fund_cat(name: str) -> str:
    n = name.lower()
    if "balanced advantage" in n:
        return "balanced_advantage"
    if "multi cap" in n or "multicap" in n:
        return "multi_cap"
    if "flexi cap" in n or "flexicap" in n:
        return "flexi_cap"
    if "mid cap" in n or "midcap" in n:
        return "mid_cap"
    if "large cap" in n or "largecap" in n:
        return "large_cap"
    if "small cap" in n or "smallcap" in n:
        return "small_cap"
    return "other"


def _num(val) -> float:
    m = re.search(r"-?\d[\d,]*\.?\d*", str(val or ""))
    return float(m.group(0).replace(",", "")) if m else float("nan")


def _clean_tax(text: str) -> str:
    text = (text or "").replace("Check past data", "")
    text = re.sub(r"^\s*Tax implication", "", text)
    return text.strip()


def _stamp(text: str) -> str:
    return re.split(r"Tax implication", text or "")[0].strip()


def _kv(d: dict, skip_empty=True) -> str:
    return "; ".join(
        f"{k.replace('_', ' ')}: {v}"
        for k, v in (d or {}).items()
        if not (skip_empty and v in ("", "--", None))
    )


def build_summary_table() -> str:
    lines = ["=== MASTER SUMMARY OF ALL INDEXED SCHEMES ==="]
    for fname, f in load_funds().items():
        ann = f.get("annualised_returns") or {}
        comp = f.get("portfolio_composition") or {}
        lines.append(
            f"- {fname} | Cat: {f.get('fund_sub_category')} | NAV: {f.get('nav')} ({f.get('nav_date')}) | "
            f"Expense: {f.get('expense_ratio')} | Min SIP: {f.get('minimum_sip')} | AUM: {f.get('fund_size_aum')} | "
            f"3Y: {ann.get('fund_return_3y')} | 5Y: {ann.get('fund_return_5y')} | 10Y: {ann.get('fund_return_10y')} | "
            f"Cash: {comp.get('cash', '-')} | Managers: {f.get('fund_managers')} | URL: {f.get('source_url')}"
        )
    return "\n".join(lines)


def build_fund_section(f: dict, max_holdings: int | None = 20) -> str:
    hold = f.get("holdings") or []
    exit_d = f.get("exit_load_details") or {}
    shown = hold if max_holdings is None else hold[:max_holdings]
    lines = [
        f"=== {f['fund_name']} ===",
        f"Source URL: {f.get('source_url', '')}",
        f"Category: {f.get('fund_category')} | Sub-Category: {f.get('fund_sub_category')} | Risk Level: {f.get('risk_level')}",
        f"NAV: {f.get('nav')} (as of {f.get('nav_date')}) | Expense Ratio: {f.get('expense_ratio')} | "
        f"Minimum SIP: {f.get('minimum_sip')} | Fund Size (AUM): {f.get('fund_size_aum')}",
        f"Fund Managers: {f.get('fund_managers')}",
        f"Performance Metrics: {_kv(f.get('performance_metrics'))}",
        f"Historical SIP Returns: {_kv(f.get('historical_returns'))}",
        f"Annualised Returns & Category Rank: {_kv(f.get('annualised_returns'))}",
        f"Portfolio Asset Allocation: {_kv(f.get('portfolio_composition'))}",
        f"Equity Sector Allocation: {_kv(f.get('equity_sector_allocation'))}",
    ]
    if f.get("debt_sector_allocation"):
        lines.append(f"Debt Sector Allocation: {_kv(f.get('debt_sector_allocation'))}")
    lines += [
        f"Investment Requirements: {_kv(f.get('investment_requirements'))}",
        f"Exit Load Rule: {exit_d.get('exit_load', '')}",
        f"Stamp Duty: {_stamp(exit_d.get('stamp_duty'))}",
        f"Tax Implication: {_clean_tax(exit_d.get('tax_implication'))}",
        f"Total Holdings Count: {len(hold)} (top {len(shown)} holdings: Rank. Company | Sector | Type | Allocation %):",
    ]
    lines += [
        f"  {i}. {h.get('company_name')} | {h.get('sector') or '-'} | {h.get('instrument_type') or '-'} | {h.get('allocation_percentage')}"
        for i, h in enumerate(shown, 1)
    ]
    return "\n".join(lines)


def detect_funds(text: str) -> list:
    """Detect matching fund(s) across all 26 schemes by exact name, AMC+category, or category."""
    funds = load_funds()
    q = " " + re.sub(r"[^a-z0-9\-&,/ ]+", " ", (text or "").lower()) + " "
    found = []

    def add(name):
        if name in funds and name not in found:
            found.append(name)

    # 1. Exact scheme names
    for name in funds:
        if name.lower() in q:
            add(name)
    if found:
        return found

    # 2. Detect AMCs mentioned
    amcs = [amc for amc, pats in AMC_PATTERNS.items() if any(re.search(p, q) for p in pats)]

    # 3. Detect categories mentioned (including fuzzy typos)
    cats = [cat for cat, pats in CATEGORY_PATTERNS.items() if any(re.search(p, q) for p in pats)]
    for tok in re.findall(r"[a-z]{5,}", q):
        hit = difflib.get_close_matches(tok, list(FUZZY_CAT_TOKENS), n=1, cutoff=0.84)
        if hit and FUZZY_CAT_TOKENS[hit[0]] not in cats:
            cats.append(FUZZY_CAT_TOKENS[hit[0]])

    # Also handle standalone mid/small/large when comparing
    if any(w in q for w in (" compare ", " vs ", " versus ", " aur ", " and ", " or ", " fund", " scheme")):
        for tok, ckey in [("mid", "mid_cap"), ("small", "small_cap"), ("large", "large_cap"), ("multi", "multi_cap"), ("flexi", "flexi_cap")]:
            if re.search(rf"\b{tok}\b", q) and not re.search(rf"\b{tok}\s+(amount|sip|money|investor|sum|number|finance)\b", q):
                if ckey not in cats:
                    cats.append(ckey)

    if amcs and cats:
        for fname in funds:
            if _fund_amc(fname) in amcs and _fund_cat(fname) in cats:
                add(fname)
    elif amcs:
        for fname in funds:
            if _fund_amc(fname) in amcs:
                add(fname)
    elif cats:
        for fname in funds:
            if _fund_cat(fname) in cats:
                add(fname)

    return found


def search_holdings_across_funds(query: str) -> list[str]:
    """Search holdings across all 26 funds for any company/stock/bond mentioned in query."""
    q_low = (query or "").lower()
    q_clean = re.sub(r"[^a-z0-9& ]+", " ", q_low)

    stop_words = {
        "what", "which", "where", "when", "who", "whom", "whose", "why", "how",
        "hdfc", "icici", "prudential", "sbi", "axis", "bandhan", "idfc",
        "fund", "funds", "scheme", "schemes", "mutual", "direct", "growth",
        "plan", "large", "small", "mid", "flexi", "multi", "balanced", "advantage", "cap",
        "nav", "expense", "ratio", "sip", "aum", "size", "exit", "load", "tax",
        "return", "returns", "holding", "holdings", "stock", "stocks", "company",
        "companies", "sector", "sectors", "allocation", "portfolio", "weight",
        "percentage", "percent", "manager", "managers", "risk", "level", "category",
        "does", "hold", "holds", "have", "has", "invest", "invested", "investment",
        "minimum", "maximum", "highest", "lowest", "top", "best", "all", "total",
        "tell", "give", "show", "list", "about", "the", "and", "for", "with",
        "from", "into", "that", "this", "kitna", "kitni", "kitne", "kaunsa",
        "kaunsi", "kaun", "kya", "hai", "hain", "mein", "aur", "iske", "iska",
        "iski", "batao", "bataiye", "share", "shares", "equity", "debt", "cash",
        "year", "years", "annualised", "historical", "rank", "average", "stamp", "duty",
        "redeem", "units", "within", "andar", "bina", "sakte", "sabse", "sasta",
        "mehenga", "common", "saare", "sabhi", "paas", "zyada", "kam", "bank",
        "banks", "india", "state", "finance", "financial", "industries", "limited",
        "pharma", "pharmaceutical", "healthcare", "technology", "motors", "power",
    }

    search_terms = set()
    matched_alias_words = set()
    for alias, target in COMPANY_ALIASES.items():
        if re.search(rf"\b{re.escape(alias)}\b", q_clean):
            search_terms.add(target)
            matched_alias_words.update(alias.split())
            matched_alias_words.update(target.split())

    tokens = [
        t for t in q_clean.split()
        if len(t) >= 4 and t not in stop_words and t not in matched_alias_words and not t.isdigit()
    ]
    for t in tokens:
        search_terms.add(t)

    if not search_terms:
        return []

    matches = []
    for fname, f in load_funds().items():
        for idx, h in enumerate(f.get("holdings") or [], 1):
            cname = (h.get("company_name") or "").lower()
            c_tokens = set(re.sub(r"[^a-z0-9]+", " ", cname).split()) - {
                "ltd", "limited", "india", "the", "of", "and", "corp", "corporation", "services", "financial", "bank"
            }
            matched = False
            for term in search_terms:
                if " " in term and term in cname:
                    matched = True
                    break
                if term in c_tokens:
                    matched = True
                    break
                if len(term) >= 6 and " " not in term and any(difflib.SequenceMatcher(None, term, ct).ratio() >= 0.88 for ct in c_tokens):
                    matched = True
                    break
            if matched:
                matches.append(
                    f"- {fname} (Rank #{idx} of {len(f.get('holdings') or [])}): "
                    f"{h.get('company_name')} | Sector: {h.get('sector') or '-'} | "
                    f"Type: {h.get('instrument_type') or '-'} | Allocation: {h.get('allocation_percentage')}"
                )
    return matches[:35]


def wants_all_funds(text: str) -> bool:
    q = " " + (text or "").lower() + " "
    return any(h in q for h in ALL_FUNDS_HINTS)


def build_context(query: str, history=None, preferred_fund=None):
    """Build compact, fast context across all 26 schemes + detailed dossiers for matched funds."""
    funds = load_funds()
    detected = detect_funds(query)
    if not detected and preferred_fund in funds:
        detected = [preferred_fund]

    carried = False
    if not detected and not wants_all_funds(query):
        for turn in reversed(history or []):
            if isinstance(turn, dict) and turn.get("role") == "user":
                d = detect_funds(turn.get("text", ""))
                if d:
                    detected, carried = d, True
                    break

    cross_fund = wants_all_funds(query) and (len(detected) != 1 or not carried)
    used = detected if (detected and not cross_fund) else list(funds)

    sections = [build_summary_table()]

    holding_hits = search_holdings_across_funds(query)
    if holding_hits:
        sections.append(
            "=== EXACT HOLDING MATCHES ACROSS ALL INDEXED FUNDS ===\n"
            + "\n".join(holding_hits)
        )

    # Detailed dossiers for focused funds (up to 6)
    detail_targets = detected[:6] if detected else list(funds)[:5]
    for fname in detail_targets:
        sections.append(build_fund_section(funds[fname], max_holdings=25 if len(detail_targets) <= 2 else 10))

    primary = detected[0] if len(detected) == 1 and not cross_fund else None
    return "\n\n".join(sections), used, primary


def deterministic_fallback_answer(query: str, used_funds: list[str], primary_fund: str | None = None) -> dict:
    """Instant (<15ms) dynamic knowledge-base answerer across all 26 funds."""
    funds = load_funds()
    q = (query or "").lower()
    all_list = [funds[n] for n in used_funds if n in funds] or list(funds.values())
    all_sources = [f["source_url"] for f in all_list if f.get("source_url")]

    if any(w in q for w in UNSUPPORTED_METRIC_WORDS):
        return {
            "answer": (
                "I couldn't find that information in the knowledge base yet. "
                "Try asking about NAV, SIP amount, expense ratio, holdings, or sector allocation."
            ),
            "sources": [],
        }

    holding_hits = search_holdings_across_funds(query)
    if holding_hits and (
        not primary_fund
        or any(w in q for w in ("hold", "holding", "stock", "share", "portfolio", "allocation", "kis", "which", "kitna", "weight", "does"))
    ):
        ans = "Here are the matching holdings from the knowledge base:\n" + "\n".join(holding_hits[:12])
        return {"answer": f"{ans}\n\nSource: {all_sources[0]}", "sources": all_sources[:5]}

    # Dynamic cross-fund superlatives & comparisons
    if not primary_fund:
        if any(w in q for w in ("sasta", "mehenga", "lowest", "highest", "cheapest", "expensive", "sabse")) and any(
            w in q for w in ("expense", "sasta", "mehenga", "cheapest", "cost", "fee", "ratio")
        ):
            ranked = sorted(
                [(f, _num(f.get("expense_ratio"))) for f in all_list if not (_num(f.get("expense_ratio")) != _num(f.get("expense_ratio")))],
                key=lambda x: x[1],
            )
            cheapest, costliest = ranked[0][0], ranked[-1][0]
            top5 = "\n".join(f"- {f['fund_name']}: {f.get('expense_ratio')}" for f, _ in ranked[:5])
            ans = (
                f"Across {len(ranked)} schemes:\n"
                f"- Lowest Expense Ratio (cheapest): {cheapest['fund_name']} ({cheapest.get('expense_ratio')})\n"
                f"- Highest Expense Ratio: {costliest['fund_name']} ({costliest.get('expense_ratio')})\n"
                f"Top 5 lowest:\n{top5}"
            )
            return {"answer": f"{ans}\n\nSource: {cheapest['source_url']}", "sources": [cheapest["source_url"], costliest["source_url"]]}

        if any(w in q for w in ("aum", "size", "bada", "chota", "largest", "smallest", "biggest", "corpus")):
            ranked = sorted(
                [(f, _num(f.get("fund_size_aum"))) for f in all_list if not (_num(f.get("fund_size_aum")) != _num(f.get("fund_size_aum")))],
                key=lambda x: x[1],
                reverse=True,
            )
            biggest, smallest = ranked[0][0], ranked[-1][0]
            top5 = "\n".join(f"- {f['fund_name']}: {f.get('fund_size_aum')}" for f, _ in ranked[:5])
            ans = (
                f"Fund Size (AUM) across {len(ranked)} schemes:\n"
                f"- Largest AUM: {biggest['fund_name']} ({biggest.get('fund_size_aum')})\n"
                f"- Smallest AUM: {smallest['fund_name']} ({smallest.get('fund_size_aum')})\n"
                f"Top 5 by AUM:\n{top5}"
            )
            return {"answer": f"{ans}\n\nSource: {biggest['source_url']}", "sources": [biggest["source_url"], smallest["source_url"]]}

        if any(w in q for w in ("cash",)) and any(w in q for w in ("sabse", "highest", "most", "zyada", "kis", "which")):
            ranked = sorted(
                [(f, _num((f.get("portfolio_composition") or {}).get("cash"))) for f in all_list if (f.get("portfolio_composition") or {}).get("cash")],
                key=lambda x: x[1],
                reverse=True,
            )
            top = ranked[0][0]
            top5 = "\n".join(f"- {f['fund_name']}: {(f.get('portfolio_composition') or {}).get('cash')}" for f, _ in ranked[:5])
            ans = f"Highest cash allocation: {top['fund_name']} at {(top.get('portfolio_composition') or {}).get('cash')}.\nTop 5:\n{top5}"
            return {"answer": f"{ans}\n\nSource: {top['source_url']}", "sources": [top["source_url"]]}

        if any(w in q for w in ("return", "performance", "cagr", "3y", "5y", "10y", "1y", "rank", "category", "beat")):
            key = "fund_return_5y" if "5" in q else ("fund_return_10y" if "10" in q else "fund_return_3y")
            ranked = sorted(
                [(f, _num((f.get("annualised_returns") or {}).get(key))) for f in all_list if (f.get("annualised_returns") or {}).get(key) not in (None, "--", "")],
                key=lambda x: x[1],
                reverse=True,
            )
            top5 = "\n".join(
                f"- {f['fund_name']}: {(f.get('annualised_returns') or {}).get(key)} (3Y: {(f.get('annualised_returns') or {}).get('fund_return_3y')}, 5Y: {(f.get('annualised_returns') or {}).get('fund_return_5y')})"
                for f, _ in ranked[:5]
            )
            ans = f"Top schemes by {key.replace('fund_return_', '').upper()} annualised return:\n{top5}"
            return {"answer": f"{ans}\n\nSource: {ranked[0][0]['source_url']}", "sources": [f["source_url"] for f, _ in ranked[:3]]}

    # Targeted fund(s) attribute lookup
    target_names = [primary_fund] if primary_fund else (used_funds[:6] or list(funds)[:6])
    targets = [funds[n] for n in target_names if n in funds]
    sources = [f["source_url"] for f in targets if f.get("source_url")]

    lines = []
    for f in targets:
        name = f["fund_name"]
        ann = f.get("annualised_returns") or {}
        hist = f.get("historical_returns") or {}
        comp = f.get("portfolio_composition") or {}
        exit_d = f.get("exit_load_details") or {}
        hold = f.get("holdings") or []
        parts = []
        if any(w in q for w in ("nav", "price", "unit value")):
            parts.append(f"NAV is {f.get('nav')} (as of {f.get('nav_date')})")
        if any(w in q for w in ("expense", "fee", "charge", "cost", "sasta", "mehenga")):
            parts.append(f"expense ratio is {f.get('expense_ratio')}")
        if any(w in q for w in ("sip", "minimum", "lumpsum", "start", "kitne se")):
            parts.append(
                f"minimum SIP is {f.get('minimum_sip')} (minimum first investment {f.get('investment_requirements', {}).get('minimum_first_investment', '₹100')})"
            )
        if any(w in q for w in ("aum", "size", "corpus", "bada", "chota", "largest", "smallest")):
            parts.append(f"fund size (AUM) is {f.get('fund_size_aum')}")
        if any(w in q for w in ("manager", "managers", "manage", "managed")) or re.search(r"\bwho\s+manages\b", q):
            parts.append(f"fund managers are {f.get('fund_managers')}")
        if any(w in q for w in ("return", "performance", "cagr", "1y", "3y", "5y", "10y", "year", "saal", "rank", "category", "beat", "one day", "1 day")):
            parts.append(
                f"annualised returns: 3Y {ann.get('fund_return_3y')} (cat avg {ann.get('category_avg_3y')}, rank #{ann.get('rank_3y')}), "
                f"5Y {ann.get('fund_return_5y')} (cat avg {ann.get('category_avg_5y')}, rank #{ann.get('rank_5y')}), "
                f"10Y {ann.get('fund_return_10y')} (cat avg {ann.get('category_avg_10y')}, rank #{ann.get('rank_10y')}); "
                f"historical SIP returns: 1Y {hist.get('1_year_return')}, 3Y {hist.get('3_years_return')}, 5Y {hist.get('5_years_return')}"
            )
        if any(w in q for w in ("exit", "redeem", "withdraw", "nikal")):
            parts.append(f"exit load: {exit_d.get('exit_load')}")
        if any(w in q for w in ("tax", "stcg", "ltcg", "stamp")):
            parts.append(f"{_stamp(exit_d.get('stamp_duty'))}; {_clean_tax(exit_d.get('tax_implication'))}")
        if any(w in q for w in ("cash", "debt", "equity", "real estate", "composition", "asset", "hybrid", "sovereign")):
            parts.append(f"portfolio composition: {_kv(comp)}")
            if f.get("debt_sector_allocation"):
                parts.append(f"debt sector allocation: {_kv(f.get('debt_sector_allocation'))}")
        if any(w in q for w in ("sector", "industry", "financial", "technology", "industrial", "healthcare")):
            parts.append(f"equity sector allocation: {_kv(f.get('equity_sector_allocation'))}")
        if any(w in q for w in ("holding", "holdings", "stock", "stocks", "top", "company", "companies", "portfolio")):
            m_top = re.search(r"\btop\s+(\d+)\b", q)
            n_top = min(int(m_top.group(1)), 15) if m_top else 5
            top_n = ", ".join(f"{h['company_name']} ({h['allocation_percentage']})" for h in hold[:n_top])
            parts.append(f"total {len(hold)} holdings; top {n_top} holdings: {top_n}")
        if any(w in q for w in ("risk", "category", "type", "sub-category")):
            parts.append(f"category: {f.get('fund_category')} ({f.get('fund_sub_category')}), risk: {f.get('risk_level')}")

        if not parts:
            parts.append(
                f"NAV {f.get('nav')} ({f.get('nav_date')}), expense ratio {f.get('expense_ratio')}, "
                f"min SIP {f.get('minimum_sip')}, AUM {f.get('fund_size_aum')}, "
                f"3Y return {ann.get('fund_return_3y')}, 5Y return {ann.get('fund_return_5y')}, "
                f"managers: {f.get('fund_managers')}"
            )
        if len(targets) == 1:
            lines.append(f"For {name}, the " + "; ".join(parts) + ".")
        else:
            lines.append(f"- {name}: " + "; ".join(parts) + ".")

    answer = "\n".join(lines)
    if sources:
        answer += f"\n\nSource: {sources[0]}"
    return {"answer": answer, "sources": sources}
