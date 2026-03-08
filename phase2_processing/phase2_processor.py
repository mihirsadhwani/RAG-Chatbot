import json
import os
import re
from datetime import datetime, timezone
import uuid

def clean_currency(val):
    if not val or not isinstance(val, str):
        return None
    cleaned = re.sub(r'[^\d.]', '', val)
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None

def clean_percentage(val):
    if not val or not isinstance(val, str):
        return None
    cleaned = val.replace('%', '').replace('+', '').strip()
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None

def empty_to_none(data):
    if isinstance(data, dict):
        return {k: empty_to_none(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [empty_to_none(v) for v in data]
    elif data == "" or data == "—" or data == "--":
        return None
    return data

def build_document_text(fund):
    nav = fund.get('nav') or 'N/A'
    if nav and '₹' in nav:
        nav = '₹' + nav.replace('₹', '').replace(',', '').strip()

    exp_ratio = fund.get('expense_ratio') or 'N/A'
    
    min_sip = fund.get('minimum_sip') or 'N/A'
    if min_sip and '₹' in min_sip:
        min_sip = '₹' + min_sip.replace('₹', '').replace(',', '').strip()
        
    fund_size = fund.get('fund_size_aum') or 'N/A'
    if fund_size and '₹' in fund_size:
        # e.g., ₹39,620.90 Cr -> ₹39620 Cr
        size_val = fund_size.replace('₹', '').replace('Cr', '').replace(',', '').strip()
        if '.' in size_val:
            size_val = size_val.split('.')[0]
        fund_size = f"₹{size_val} Cr"

    perf = fund.get('performance_metrics', {})
    ret_3y = perf.get('three_year_annualised_return') or 'N/A'
    if ret_3y.startswith('+'):
        ret_3y = ret_3y[1:]

    hist_ret = fund.get('historical_returns', {})
    ret_1y = hist_ret.get('1_year_return') or 'N/A'
    ret_3y_hist = hist_ret.get('3_years_return') or 'N/A'
    ret_5y = hist_ret.get('5_years_return') or 'N/A'
    ret_10y = hist_ret.get('10_years_return') or 'N/A'

    # Clean + signs
    if ret_1y.startswith('+'): ret_1y = ret_1y[1:]
    if ret_3y_hist.startswith('+'): ret_3y_hist = ret_3y_hist[1:]
    if ret_5y.startswith('+'): ret_5y = ret_5y[1:]
    if ret_10y.startswith('+'): ret_10y = ret_10y[1:]

    holdings = fund.get('holdings', [])
    top_holdings = holdings[:3]
    top_holdings_lines = []
    for h in top_holdings:
        top_holdings_lines.append(f"{h.get('company_name')} – {h.get('allocation_percentage')}")
    top_holdings_str = "\n".join(top_holdings_lines)

    sectors = fund.get('equity_sector_allocation', {})
    # Take top 3 sectors or all if less
    top_sectors = list(sectors.items())[:3]
    top_sectors_lines = []
    for s_name, s_val in top_sectors:
        top_sectors_lines.append(f"{s_name} – {s_val}")
    sector_str = "\n".join(top_sectors_lines)

    exit_load_data = fund.get('exit_load_details', {})
    exit_load = exit_load_data.get('exit_load') or 'N/A'
    tax_imp = exit_load_data.get('tax_implication') or 'N/A'

    fund_managers = fund.get('fund_managers') or 'N/A'

    doc_text = f"Fund Name: {fund.get('fund_name')}\n\n"
    doc_text += f"Fund Managers: {fund_managers}\n"
    doc_text += f"NAV: {nav}\n"
    doc_text += f"Expense Ratio: {exp_ratio}\n"
    doc_text += f"Minimum SIP: {min_sip}\n"
    doc_text += f"Fund Size (AUM): {fund_size}\n\n"
    doc_text += f"Performance:\n3 Year Annualised Return: {ret_3y}\n\n"
    doc_text += f"Historical Returns:\n1 Year: {ret_1y}\n3 Years: {ret_3y_hist}\n5 Years: {ret_5y}\n10 Years: {ret_10y}\n\n"
    doc_text += f"Top Holdings:\n{top_holdings_str}\n\n"
    doc_text += f"Sector Allocation:\n{sector_str}\n\n"
    doc_text += f"Exit Load:\n{exit_load}\n\n"
    doc_text += f"Tax Implications:\n{tax_imp}\n"
    
    return doc_text

def process_data():
    input_file = os.path.join("..", "phase1_ingestion", "output", "raw_funds.json")
    output_dir = "output"
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    with open(input_file, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)

    processed_funds = []
    fund_documents = []
    timestamp = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

    for i, fund in enumerate(raw_data):
        print(f"Processing fund {i+1}/{len(raw_data)} - {fund.get('fund_name')}")
        
        # 1. Clean missing fields
        cleaned_fund = empty_to_none(fund)
        
        # 2. Add metadata
        cleaned_fund['scraped_source'] = "groww"
        cleaned_fund['data_type'] = "mutual_fund"
        cleaned_fund['processed_at'] = timestamp

        # 3. Normalize values in a new dictionary to keep structure but clean types
        if cleaned_fund.get('nav'): cleaned_fund['nav_normalized'] = clean_currency(cleaned_fund['nav'])
        if cleaned_fund.get('expense_ratio'): cleaned_fund['expense_ratio_normalized'] = clean_percentage(cleaned_fund['expense_ratio'])
        if cleaned_fund.get('minimum_sip'): cleaned_fund['minimum_sip_normalized'] = clean_currency(cleaned_fund['minimum_sip'])
        if cleaned_fund.get('fund_size_aum'): cleaned_fund['fund_size_aum_normalized'] = clean_currency(cleaned_fund['fund_size_aum'])
        
        if cleaned_fund.get('performance_metrics'):
            for k in ['three_year_annualised_return', 'one_day_return']:
                if cleaned_fund['performance_metrics'].get(k):
                    cleaned_fund['performance_metrics'][f'{k}_normalized'] = clean_percentage(cleaned_fund['performance_metrics'][k])

        # 4. Construct human-readable document
        doc_text = build_document_text(fund)
        
        fund_doc = {
            "fund_name": fund.get('fund_name'),
            "source_url": fund.get('source_url'),
            "document_text": doc_text
        }
        
        processed_funds.append(cleaned_fund)
        fund_documents.append(fund_doc)

    with open(os.path.join(output_dir, "processed_funds.json"), 'w', encoding='utf-8') as f:
        json.dump(processed_funds, f, indent=2, ensure_ascii=False)

    with open(os.path.join(output_dir, "fund_documents.json"), 'w', encoding='utf-8') as f:
        json.dump(fund_documents, f, indent=2, ensure_ascii=False)
        
    print("Data processing complete.")

if __name__ == "__main__":
    process_data()
