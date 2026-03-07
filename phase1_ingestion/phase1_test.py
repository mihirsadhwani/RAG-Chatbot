import os
import json
import subprocess
import sys

def run_scraper():
    print("Starting Phase 1 Scraper...")
    scraper_path = os.path.join(os.path.dirname(__file__), "phase1_scraper.py")
    
    result = subprocess.run([sys.executable, scraper_path], capture_output=True, text=True, encoding='utf-8')
    
    if result.returncode != 0:
        print("Scraper failed with errors:")
        print(result.stderr)
        return False
    
    print(result.stdout)
    return True

def verify_output():
    output_path = os.path.join(os.path.dirname(__file__), "output", "raw_funds.json")
    
    if not os.path.exists(output_path):
        print(f"Error: {output_path} not found.")
        return False
    
    with open(output_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if len(data) != 5:
        print(f"Error: Expected 5 funds, but got {len(data)}")
        return False

    required_fields = ["fund_name", "nav", "expense_ratio", "minimum_sip"]
    valid = True
    for i, fund in enumerate(data):
        missing = [field for field in required_fields if not fund.get(field)]
        if missing:
            print(f"Warning: Fund {i+1} ({fund.get('fund_name', 'Unknown')}) is missing fields: {', '.join(missing)}")
            # We treat missing as an error for this test to match prompt requirement
            valid = False
            
    if valid:
        print("Phase 1 ingestion successful - 5 schemes scraped.")
        return True
    else:
        print("Phase 1 ingestion failed - some required fields are missing.")
        return False

if __name__ == "__main__":
    if run_scraper():
        if verify_output():
            sys.exit(0)
        else:
            sys.exit(1)
    else:
        sys.exit(1)
