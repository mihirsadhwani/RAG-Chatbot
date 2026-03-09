"""
Phase 2 — RAG Chunk Builder

Converts fund_documents.json into rag_chunks.jsonl.

Each chunk is a natural-language sentence that ALWAYS includes the full scheme
name so that semantic retrieval can match user queries like
"expense ratio of large cap fund" against the indexed documents.

For every attribute we generate 2-3 sentence variations to maximise recall.
"""

import json
import os
import uuid


def _safe(val, fallback="N/A"):
    """Return the value if truthy, else fallback."""
    if val is None or (isinstance(val, str) and val.strip() in ("", "—", "--")):
        return fallback
    return val


def _generate_attribute_chunks(fund_name, source_url, fund):
    """Generate multiple natural-language chunks per fund attribute."""
    chunks = []

    def _add(text, chunk_type="attribute"):
        chunks.append({
            "chunk_id": str(uuid.uuid4()),
            "fund_name": fund_name,
            "source_url": source_url,
            "text": text.strip(),
            "chunk_type": chunk_type,
        })

    # ------------------------------------------------------------------
    # NAV
    # ------------------------------------------------------------------
    nav = _safe(fund.get("nav"))
    if nav != "N/A":
        _add(f"The NAV of {fund_name} is {nav}.")
        _add(f"{fund_name} currently has a NAV of {nav}.")

    # ------------------------------------------------------------------
    # Expense Ratio
    # ------------------------------------------------------------------
    er = _safe(fund.get("expense_ratio"))
    if er != "N/A":
        _add(f"The expense ratio of {fund_name} is {er}.")
        _add(f"{fund_name} has an expense ratio of {er}.")
        _add(f"The annual expense ratio for {fund_name} is {er}.")

    # ------------------------------------------------------------------
    # Minimum SIP
    # ------------------------------------------------------------------
    sip = _safe(fund.get("minimum_sip"))
    if sip != "N/A":
        _add(f"The minimum SIP amount for {fund_name} is {sip}.")
        _add(f"You can start investing in {fund_name} with a SIP of {sip}.")

    # ------------------------------------------------------------------
    # Fund Size / AUM
    # ------------------------------------------------------------------
    aum = _safe(fund.get("fund_size_aum"))
    if aum != "N/A":
        _add(f"The fund size (AUM) of {fund_name} is {aum}.")
        _add(f"{fund_name} manages assets worth {aum}.")

    # ------------------------------------------------------------------
    # Risk Level
    # ------------------------------------------------------------------
    risk = _safe(fund.get("risk_level"))
    if risk != "N/A":
        _add(f"The risk level of {fund_name} is {risk}.")
        _add(f"{fund_name} is categorised as {risk}.")

    # ------------------------------------------------------------------
    # Fund Category
    # ------------------------------------------------------------------
    category = _safe(fund.get("fund_category"))
    sub_cat = _safe(fund.get("fund_sub_category"))
    if category != "N/A":
        cat_text = category
        if sub_cat != "N/A":
            cat_text += f" ({sub_cat})"
        _add(f"{fund_name} belongs to the {cat_text} category.")

    # ------------------------------------------------------------------
    # Fund Managers
    # ------------------------------------------------------------------
    managers = _safe(fund.get("fund_managers"))
    if managers != "N/A":
        _add(f"The fund managers of {fund_name} are {managers}.")
        _add(f"{fund_name} is managed by {managers}.")

    # ------------------------------------------------------------------
    # Exit Load
    # ------------------------------------------------------------------
    exit_details = fund.get("exit_load_details") or {}
    exit_load = _safe(exit_details.get("exit_load"))
    if exit_load != "N/A":
        _add(f"The exit load policy for {fund_name}: {exit_load}")

    # ------------------------------------------------------------------
    # Tax Implication
    # ------------------------------------------------------------------
    tax = _safe(exit_details.get("tax_implication"))
    if tax != "N/A":
        _add(f"Tax implications for {fund_name}: {tax}")

    # ------------------------------------------------------------------
    # Performance / Returns
    # ------------------------------------------------------------------
    perf = fund.get("performance_metrics") or {}
    ret_3y = _safe(perf.get("three_year_annualised_return"))
    if ret_3y != "N/A":
        val = ret_3y.lstrip("+")
        _add(f"The 3-year annualised return of {fund_name} is {val}.")
        _add(f"{fund_name} has delivered a 3-year annualised return of {val}.")

    hist = fund.get("historical_returns") or {}
    for period, key in [("1 year", "1_year_return"), ("3 years", "3_years_return"),
                         ("5 years", "5_years_return"), ("10 years", "10_years_return")]:
        val = _safe(hist.get(key))
        if val != "N/A":
            clean = val.lstrip("+")
            _add(f"The {period} return of {fund_name} is {clean}.")

    # Investment amounts for historical context
    for period, inv_key, became_key in [
        ("1 year", "1_year_total_investment", "1_year_would_become"),
        ("3 years", "3_years_total_investment", "3_years_would_become"),
        ("5 years", "5_years_total_investment", "5_years_would_become"),
        ("10 years", "10_years_total_investment", "10_years_would_become"),
    ]:
        inv = _safe(hist.get(inv_key))
        became = _safe(hist.get(became_key))
        ret = _safe(hist.get(period.replace(" ", "_") + "_return" if "year " not in period
                             else period.replace(" years", "_years_return").replace(" year", "_year_return")))
        if inv != "N/A" and became != "N/A":
            _add(f"If you had invested {inv} per month in {fund_name} for {period}, it would have become {became}.")

    # ------------------------------------------------------------------
    # Top Holdings
    # ------------------------------------------------------------------
    holdings = fund.get("holdings") or []
    if holdings:
        top5 = holdings[:5]
        lines = [f"  {h.get('company_name', '?')} ({h.get('allocation_percentage', '?')})" for h in top5]
        holding_text = "\n".join(lines)
        _add(f"Top holdings of {fund_name}:\n{holding_text}", chunk_type="holdings")

        # Individual holdings as separate chunks
        for h in top5:
            name = h.get("company_name", "")
            pct = h.get("allocation_percentage", "")
            if name and pct:
                _add(f"{fund_name} holds {name} with an allocation of {pct}.", chunk_type="holdings")

    # ------------------------------------------------------------------
    # Sector Allocation
    # ------------------------------------------------------------------
    sectors = fund.get("equity_sector_allocation") or {}
    if sectors:
        lines = [f"  {s}: {v}" for s, v in list(sectors.items())[:5]]
        sector_text = "\n".join(lines)
        _add(f"Sector allocation of {fund_name}:\n{sector_text}", chunk_type="sectors")

    # ------------------------------------------------------------------
    # Full Profile (combined chunk for broad queries)
    # ------------------------------------------------------------------
    profile_parts = [f"Fund Name: {fund_name}"]
    if managers != "N/A":
        profile_parts.append(f"Fund Managers: {managers}")
    if nav != "N/A":
        profile_parts.append(f"NAV: {nav}")
    if er != "N/A":
        profile_parts.append(f"Expense Ratio: {er}")
    if sip != "N/A":
        profile_parts.append(f"Minimum SIP: {sip}")
    if aum != "N/A":
        profile_parts.append(f"Fund Size (AUM): {aum}")
    if risk != "N/A":
        profile_parts.append(f"Risk Level: {risk}")
    _add("\n".join(profile_parts), chunk_type="fund_profile")

    return chunks


def create_chunks():
    input_file = os.path.join("output", "fund_documents.json")
    output_file = os.path.join("output", "rag_chunks.jsonl")

    # We read the RAW data directly because fund_documents.json has a single
    # long block of text.  For natural-language chunks we need the structured
    # fields, so we fall back to processed_funds.json (which retains structure).
    processed_file = os.path.join("output", "processed_funds.json")

    with open(processed_file, "r", encoding="utf-8") as f:
        funds = json.load(f)

    all_chunks = []
    for fund in funds:
        fund_name = fund.get("fund_name", "Unknown")
        source_url = fund.get("source_url", "")
        chunks = _generate_attribute_chunks(fund_name, source_url, fund)
        all_chunks.extend(chunks)

    with open(output_file, "w", encoding="utf-8") as f:
        for chunk in all_chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")

    print(f"Created {len(all_chunks)} RAG chunks across {len(funds)} funds.")


if __name__ == "__main__":
    create_chunks()
