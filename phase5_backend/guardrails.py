import re

# Funds in the knowledge base (exact scraped scheme names)
KNOWN_FUNDS = [
    "HDFC Balanced Advantage Fund Direct Growth",
    "HDFC Flexi Cap Direct Plan Growth",
    "HDFC Mid Cap Fund Direct Growth",
    "HDFC Large Cap Fund Direct Growth",
    "HDFC Small Cap Fund Direct Growth",
]

# Alternate names / aliases that map to the known funds
FUND_ALIASES = {
    "hdfc balanced advantage": "HDFC Balanced Advantage Fund Direct Growth",
    "hdfc balanced": "HDFC Balanced Advantage Fund Direct Growth",
    "hdfc flexi cap": "HDFC Flexi Cap Direct Plan Growth",
    "hdfc flexicap": "HDFC Flexi Cap Direct Plan Growth",
    "hdfc mid cap": "HDFC Mid Cap Fund Direct Growth",
    "hdfc mid-cap": "HDFC Mid Cap Fund Direct Growth",
    "hdfc midcap": "HDFC Mid Cap Fund Direct Growth",
    "hdfc large cap": "HDFC Large Cap Fund Direct Growth",
    "hdfc top 100": "HDFC Large Cap Fund Direct Growth",
    "hdfc large-cap": "HDFC Large Cap Fund Direct Growth",
    "hdfc largecap": "HDFC Large Cap Fund Direct Growth",
    "hdfc small cap": "HDFC Small Cap Fund Direct Growth",
    "hdfc smallcap": "HDFC Small Cap Fund Direct Growth",
    "hdfc small-cap": "HDFC Small Cap Fund Direct Growth",
    "hdfc equity": "HDFC Flexi Cap Direct Plan Growth",
}

# Topics we can answer about
SUPPORTED_TOPICS = [
    "expense ratio", "nav", "minimum sip", "sip", "fund size", "aum",
    "exit load", "benchmark", "risk", "returns", "return", "holdings",
    "sector allocation", "sector", "tax", "stamp duty", "fund manager",
    "allocation", "portfolio", "composition", "performance", "annualised",
    "historical", "1 year", "3 year", "5 year", "10 year",
]

# Investment advice patterns to reject
ADVICE_PATTERNS = [
    r"\bshould\s+i\s+invest\b",
    r"\bwhich\s+(fund|scheme|mutual\s+fund)\s+is\s+best\b",
    r"\bbetter\s+(fund|scheme|investment)\b",
    r"\brecommend\b",
    r"\badvice\b",
    r"\bsuggest\b",
    r"\bcompare\b.*\b(fund|scheme)\b",
    r"\bbuy\s+or\s+sell\b",
    r"\binvest\s+in\b",
    r"\bgood\s+(fund|investment|scheme)\b",
]

ADVICE_RESPONSE = "I can only provide factual information about mutual fund schemes and cannot give investment advice."

UNKNOWN_FUND_RESPONSE = """I currently have information only about the following HDFC mutual fund schemes:

- HDFC Balanced Advantage Fund
- HDFC Flexi Cap Fund
- HDFC Mid Cap Fund
- HDFC Large Cap Fund
- HDFC Small Cap Fund"""


def is_investment_advice(query: str) -> bool:
    """Check if the user is asking for investment advice."""
    q_lower = query.lower()
    for pattern in ADVICE_PATTERNS:
        if re.search(pattern, q_lower):
            return True
    return False


def mentions_known_fund(query: str) -> bool:
    """Check if the query mentions a fund we know about."""
    q_lower = query.lower()
    # Check direct fund names
    for fund in KNOWN_FUNDS:
        if fund.lower() in q_lower:
            return True
    # Check aliases
    for alias in FUND_ALIASES:
        if alias in q_lower:
            return True
    # Generic "hdfc" + topic is also valid
    if "hdfc" in q_lower:
        return True
    return False


def mentions_unknown_fund(query: str) -> bool:
    """Check if the query mentions a non-HDFC fund explicitly."""
    q_lower = query.lower()
    # Common non-HDFC AMC names
    other_amcs = [
        "sbi", "icici", "axis", "kotak", "nippon", "tata", "dsp",
        "aditya birla", "franklin", "mirae", "motilal", "uti",
        "canara", "invesco", "pgim", "edelweiss", "hsbc", "idfc",
        "sundaram", "bandhan", "quant", "parag parikh", "ppfas",
    ]
    for amc in other_amcs:
        if amc in q_lower:
            return True
    return False


def mentions_supported_topic(query: str) -> bool:
    """Check if the query is about a supported factual topic."""
    q_lower = query.lower()
    for topic in SUPPORTED_TOPICS:
        if topic in q_lower:
            return True
    return False


def validate_query(query: str) -> dict:
    """
    Validate a user query and return a result dict.
    
    Returns:
        {
            "valid": bool,
            "rejection_message": str or None
        }
    """
    if not query or not query.strip():
        return {"valid": False, "rejection_message": "Please provide a question about HDFC mutual fund schemes."}

    # 1. Check for investment advice
    if is_investment_advice(query):
        return {"valid": False, "rejection_message": ADVICE_RESPONSE}

    # 2. Check for unknown (non-HDFC) funds
    if mentions_unknown_fund(query) and not mentions_known_fund(query):
        return {"valid": False, "rejection_message": UNKNOWN_FUND_RESPONSE}

    # 3. Allow through — the RAG pipeline + LLM will handle edge cases
    return {"valid": True, "rejection_message": None}
