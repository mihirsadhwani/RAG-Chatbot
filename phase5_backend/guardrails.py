import re
from phase5_backend.knowledge_base import detect_funds, load_funds

SUPPORTED_AMCS = ["hdfc", "icici", "icici prudential", "sbi", "axis", "bandhan", "idfc"]

FACTUAL_METRIC_WORDS = (
    r"\b(return|returns|cagr|nav|expense|ratio|aum|size|sip|exit\s+load|"
    r"rank|ranking|holding|holdings|cash|debt|equity|allocation|performance|"
    r"1y|3y|5y|10y|1\s*year|3\s*year|5\s*year|10\s*year)\b"
)

ADVICE_PATTERNS = [
    r"\bshould\s+i\s+(invest|buy|sell|redeem|switch|start|stop)\b",
    r"\b(can|could|would)\s+you\s+(recommend|suggest|advise)\b",
    r"\brecommend\b",
    r"\badvice\b",
    r"\badvise\s+me\b",
    r"\bsuggest\s+(me\s+)?(a|some|which)?\s*(good|best)?\s*(fund|scheme|mutual\s+fund|investment)\b",
    r"\bwhich\s+(fund|scheme|mutual\s+fund)\s+is\s+(best|better|good|right|suitable|ideal)\b",
    r"\b(best|good|better)\s+(fund|scheme|investment)\s+(for\s+me|to\s+invest|to\s+buy|for\s+long\s+term|for\s+short\s+term)\b",
    r"\bbuy\s+or\s+sell\b",
    r"\bworth\s+(investing|buying)\b",
    r"\bkya\s+(mujhe|main|hum)\s+.*\b(invest|buy|kharid|lagana)\b",
    r"\bkaunsa\s+(fund|scheme)\s+(lena|kharidna|sahi|best)\s+(chahiye|rahega|hai\s+mere\s+liye)\b",
]

ADVICE_RESPONSE = (
    "I can only provide factual information about mutual fund schemes and cannot give investment advice."
)

UNKNOWN_FUND_RESPONSE = (
    "I currently have information for 26 schemes across 5 AMCs in my knowledge base:\n\n"
    "- HDFC Mutual Fund (Balanced Advantage, Multi Cap, Flexi Cap, Mid Cap, Large Cap, Small Cap)\n"
    "- ICICI Prudential Mutual Fund (Small Cap, Mid Cap, Large Cap, Multi Cap, Flexi Cap)\n"
    "- SBI Mutual Fund (Small Cap, Mid Cap, Large Cap, Multicap, Flexicap)\n"
    "- Axis Mutual Fund (Small Cap, Midcap, Large Cap, Multicap, Flexi Cap)\n"
    "- Bandhan Mutual Fund / IDFC (Small Cap, Mid Cap, Large Cap, Multi Cap, Flexi Cap)"
)


def is_investment_advice(query: str) -> bool:
    """Check if the user is asking for subjective investment advice."""
    q_lower = query.lower().strip()

    if re.search(r"\b(which|kaunsa|konsa)\b.*\b(best|better|good)\b", q_lower) and re.search(
        FACTUAL_METRIC_WORDS, q_lower
    ):
        if not re.search(r"\b(should\s+i|for\s+me|recommend|advise|buy\s+or\s+sell)\b", q_lower):
            return False

    for pattern in ADVICE_PATTERNS:
        if re.search(pattern, q_lower):
            return True
    return False


def mentions_known_fund(query: str) -> bool:
    """Check if the query mentions any supported AMC or scheme in the knowledge base."""
    q_lower = query.lower()
    for amc in SUPPORTED_AMCS:
        if re.search(rf"\b{re.escape(amc)}\b", q_lower):
            return True
    if len(detect_funds(query)) > 0:
        return True
    for fname in load_funds():
        if fname.lower() in q_lower:
            return True
    return False


def mentions_unknown_fund(query: str) -> bool:
    """Check if the query asks about an unsupported mutual fund AMC."""
    q_lower = query.lower()

    holding_context = re.search(
        r"\b(hold|holds|holding|holdings|stock|stocks|share|shares|company|companies|portfolio|allocation|weight)\b",
        q_lower,
    )

    unsupported_amcs = [
        "aditya birla", "franklin", "mirae", "motilal", "uti", "canara robeco",
        "invesco", "pgim", "edelweiss", "hsbc", "sundaram", "quant",
        "parag parikh", "ppfas", "nippon", "dsp",
    ]
    for amc in unsupported_amcs:
        if re.search(rf"\b{re.escape(amc)}\b", q_lower):
            return True

    # Names that can be BOTH an unsupported AMC and a stock holding
    ambiguous_amcs = ["kotak", "tata"]
    for amc in ambiguous_amcs:
        if re.search(rf"\b{re.escape(amc)}\b", q_lower):
            if re.search(rf"\b{re.escape(amc)}\s+(mahindra|bank|life|motors|steel|power|communications|consultancy|consumer|chemicals|elxsi)\b", q_lower):
                continue
            if holding_context:
                continue
            return True

    return False


def validate_query(query: str) -> dict:
    """Validate a user query and return {'valid': bool, 'rejection_message': str | None}."""
    if not query or not query.strip():
        return {
            "valid": False,
            "rejection_message": "Please provide a question about mutual fund schemes in the knowledge base.",
        }

    if is_investment_advice(query):
        return {"valid": False, "rejection_message": ADVICE_RESPONSE}

    if mentions_unknown_fund(query) and not any(
        re.search(rf"\b{re.escape(amc)}\b", query.lower()) for amc in SUPPORTED_AMCS
    ):
        return {"valid": False, "rejection_message": UNKNOWN_FUND_RESPONSE}

    return {"valid": True, "rejection_message": None}
