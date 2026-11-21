import asyncio
import json
import os
import re
from playwright.async_api import async_playwright

class Phase1Scraper:
    def __init__(self, urls_file, output_file):
        with open(urls_file, 'r') as f:
            self.urls = json.load(f)
        self.output_file = output_file
        self.results = []

    async def scrape(self):
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            
            total = len(self.urls)
            semaphore = asyncio.Semaphore(4)

            async def scrape_url(index, url):
                async with semaphore:
                    print(f"Processing {index + 1}/{total}: {url}", flush=True)
                    page = await context.new_page()
                    try:
                        await page.goto(url, wait_until="domcontentloaded", timeout=35000)
                        await page.wait_for_selector("h1", timeout=12000)
                        try:
                            await page.wait_for_load_state("networkidle", timeout=8000)
                        except Exception:
                            pass

                        # Trigger the lazy-loaded return and portfolio sections.
                        for scroll in range(8):
                            await page.evaluate(f"window.scrollTo(0, {scroll * 1000})")
                            await page.wait_for_timeout(350)
                        await page.evaluate("window.scrollTo(0, 0)")
                        await page.wait_for_timeout(300)

                        fund_data = await self.extract_fund_data(page, url)
                        print(f"Extracted: {fund_data['fund_name']}", flush=True)
                        return fund_data
                    except Exception as e:
                        print(f"Error scraping {url}: {e}", flush=True)
                        return None
                    finally:
                        await page.close()

            results = await asyncio.gather(*(scrape_url(i, url) for i, url in enumerate(self.urls)))
            fresh = [fund for fund in results if fund]
            existing = []
            if os.path.exists(self.output_file):
                try:
                    with open(self.output_file, "r", encoding="utf-8") as f:
                        existing = json.load(f)
                except (OSError, json.JSONDecodeError):
                    existing = []
            by_url = {fund.get("source_url"): fund for fund in existing if fund.get("source_url")}
            by_url.update({fund.get("source_url"): fund for fund in fresh if fund.get("source_url")})
            self.results = [by_url[url] for url in self.urls if url in by_url]
            
            await browser.close()
        
        self.save_results()

    async def safe_evaluate(self, page, js_expression, default=""):
        """Safely evaluate JavaScript and return result or default."""
        try:
            result = await page.evaluate(js_expression)
            return result if result else default
        except:
            return default

    async def get_text_by_xpath(self, page, xpath, default=""):
        try:
            element = page.locator(f"xpath={xpath}")
            if await element.count() > 0 and await element.first.is_visible():
                return (await element.first.inner_text()).strip()
        except:
            pass
        return default

    async def extract_fund_data(self, page, url):
        # === FUND NAME ===
        fund_name = await self.get_text_by_xpath(page, "//h1")

        # === CATEGORY & RISK (from pills next to h1) ===
        # Structure: <section class="header_schemeNameContainer">
        #   <h1>...</h1>
        #   <div class="pills_container">
        #     <a><div class="pill12Pill"><span>Hybrid</span></div></a>
        #     <a><div class="pill12Pill"><span>Dynamic Asset Allocation</span></div></a>
        #     <a><div class="pill12Pill"><span>Very High Risk</span></div></a>
        pills = await self.safe_evaluate(page, """
            () => {
                const container = document.querySelector('.pills_container__aqEZ6, [class*="pills_container"]');
                if (!container) return [];
                return Array.from(container.querySelectorAll('span')).map(s => s.textContent.trim());
            }
        """, [])
        
        fund_category = ""
        fund_sub_category = ""
        risk_level = ""
        if isinstance(pills, list):
            for pill in pills:
                if "risk" in pill.lower():
                    risk_level = pill
                elif not fund_category:
                    fund_category = pill
                else:
                    fund_sub_category = pill

        # === NAV, NAV DATE, MIN SIP, FUND SIZE, EXPENSE RATIO ===
        # Structure: <div class="fundDetails_fundDetailsContainer">
        #   <div class="fundDetails_gap4"><div>NAV: 05 Mar '26</div><div>₹564.64</div></div>
        #   <div class="fundDetails_gap4"><div>Min. for SIP</div><div>₹100</div></div>
        #   <div class="fundDetails_gap4"><div>Fund size</div><div>₹1,06,820.61 Cr</div></div>
        #   <div class="fundDetails_gap4"><div>Expense ratio</div><div>0.77%</div></div>
        fund_details = await self.safe_evaluate(page, """
            () => {
                const container = document.querySelector('[class*="fundDetails_fundDetailsContainer"]');
                if (!container) return {};
                const result = {};
                // Use direct children only to avoid matching nested gap4 divs
                const children = container.children;
                for (let i = 0; i < children.length; i++) {
                    const item = children[i];
                    const divs = item.querySelectorAll('div');
                    if (divs.length >= 2) {
                        const label = divs[0].textContent.trim();
                        // Value may be in divs[1] or divs[2] (expense_ratio has 3 child divs)
                        let value = divs[1].textContent.trim();
                        if (!value && divs.length >= 3) value = divs[2].textContent.trim();
                        if (label.includes('NAV')) {
                            result['nav_label'] = label;
                            result['nav'] = value;
                        } else if (label.includes('SIP')) {
                            result['min_sip'] = value;
                        } else if (label.includes('Fund size')) {
                            result['fund_size'] = value;
                        } else if (label.includes('Expense')) {
                            result['expense_ratio'] = value;
                        }
                    }
                }
                return result;
            }
        """, {})

        nav = fund_details.get("nav", "")
        nav_label = fund_details.get("nav_label", "")
        nav_date = ""
        if nav_label:
            # Extract date from "NAV: 05 Mar '26"
            match = re.search(r'NAV:\s*(.+)', nav_label)
            if match:
                nav_date = match.group(1).strip()

        min_sip = fund_details.get("min_sip", "")
        fund_size_aum = fund_details.get("fund_size", "")
        expense_ratio = fund_details.get("expense_ratio", "")

        # === 3Y ANNUALISED RETURN ===
        # The ticker animation makes direct text extraction unreliable.
        # Instead, we extract 3Y return from the annualised returns table (Table 2).
        three_year_return = await self.safe_evaluate(page, """
            () => {
                const tables = document.querySelectorAll('table');
                for (const t of tables) {
                    if (t.innerText.includes('Fund returns') && t.innerText.includes('Category average')) {
                        const rows = t.querySelectorAll('tr');
                        for (const r of rows) {
                            const cells = Array.from(r.querySelectorAll('td, th')).map(c => c.textContent.trim());
                            // Find header row to locate 3Y column
                            const headerRow = rows[0];
                            const headers = Array.from(headerRow.querySelectorAll('td, th')).map(c => c.textContent.trim());
                            const idx3Y = headers.indexOf('3Y');
                            if (cells[0] && cells[0].includes('Fund returns') && idx3Y >= 0) {
                                return cells[idx3Y] || '';
                            }
                        }
                    }
                }
                return '';
            }
        """)

        # === 1D RETURN ===
        one_day_return = await self.safe_evaluate(page, """
            () => {
                const el = document.querySelector('[class*="returnStats_oneDayReturn"]');
                return el ? el.textContent.trim() : '';
            }
        """)
        # Clean "1D" from the string if present
        if one_day_return:
            one_day_return = one_day_return.replace(" 1D", "").strip()

        # === HISTORICAL RETURNS TABLE (Table 0: "Over the past") ===
        historical_returns = await self.safe_evaluate(page, """
            () => {
                const tables = document.querySelectorAll('table');
                const result = {};
                for (const table of tables) {
                    const text = table.innerText;
                    if (text.includes('Over the past')) {
                        const rows = table.querySelectorAll('tr');
                        for (const row of rows) {
                            const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent.trim());
                            if (cells.length >= 2) {
                                const period = cells[0].toLowerCase().replace(/\\s+/g, '_');
                                if (period.includes('year') || period.includes('month')) {
                                    result[period + '_total_investment'] = cells[1] || '';
                                    result[period + '_would_become'] = cells[2] || '';
                                    // The return value may be in cells[3] or cells[4]
                                    const returnVal = cells.find(c => c.includes('%') && c.includes('+') || c.includes('-'));
                                    if (returnVal) result[period + '_return'] = returnVal;
                                }
                            }
                        }
                        break;
                    }
                }
                return result;
            }
        """, {})

        # === ANNUALISED RETURNS TABLE (Table 2: Fund returns, Category avg, Rank) ===
        annualised_returns = await self.safe_evaluate(page, """
            () => {
                const tables = document.querySelectorAll('table');
                const result = {};
                for (const table of tables) {
                    const text = table.innerText;
                    if (text.includes('Fund returns') && text.includes('Category average')) {
                        const rows = table.querySelectorAll('tr');
                        // First row has headers: Name, 3Y, 5Y, 10Y, All
                        const headerRow = rows[0];
                        const headers = Array.from(headerRow.querySelectorAll('td, th')).map(c => c.textContent.trim());
                        
                        for (let i = 1; i < rows.length; i++) {
                            const cells = Array.from(rows[i].querySelectorAll('td, th')).map(c => c.textContent.trim());
                            if (cells.length >= 2) {
                                const label = cells[0].toLowerCase();
                                if (label.includes('fund returns')) {
                                    for (let j = 1; j < cells.length && j < headers.length; j++) {
                                        result['fund_return_' + headers[j].toLowerCase()] = cells[j];
                                    }
                                } else if (label.includes('category average')) {
                                    for (let j = 1; j < cells.length && j < headers.length; j++) {
                                        result['category_avg_' + headers[j].toLowerCase()] = cells[j];
                                    }
                                } else if (label.includes('rank')) {
                                    for (let j = 1; j < cells.length && j < headers.length; j++) {
                                        result['rank_' + headers[j].toLowerCase()] = cells[j];
                                    }
                                }
                            }
                        }
                        break;
                    }
                }
                return result;
            }
        """, {})

        # === HOLDINGS (Table 1: Name, Sector, Instruments, Assets) ===
        holdings = await self.safe_evaluate(page, """
            () => {
                const tables = document.querySelectorAll('table');
                const holdings = [];
                for (const table of tables) {
                    const text = table.innerText;
                    if (text.includes('Name') && text.includes('Sector') && text.includes('Assets')) {
                        const rows = table.querySelectorAll('tbody tr, tr');
                        for (let i = 0; i < rows.length; i++) {
                            const cells = Array.from(rows[i].querySelectorAll('td')).map(c => c.textContent.trim());
                            if (cells.length >= 4) {
                                const name = cells[0];
                                // Skip header or empty rows
                                if (!name || name === 'Name' || name.includes('Category') || name.includes('Rank')) continue;
                                holdings.push({
                                    company_name: name,
                                    sector: cells[1],
                                    instrument_type: cells[2],
                                    allocation_percentage: cells[3]
                                });
                            }
                        }
                        break;
                    }
                }
                return holdings;
            }
        """, [])

        # === EQUITY SECTOR ALLOCATION ===
        # Text has NO newlines - it's "Financial33.43%". Use regex to split.
        equity_sector_allocation = await self.safe_evaluate(page, """
            () => {
                const result = {};
                const headings = document.querySelectorAll('[class*="holdingAnalysis_sectionTitle"]');
                for (const h of headings) {
                    if (h.textContent.includes('Equity sector allocation')) {
                        const container = h.parentElement;
                        const items = container.querySelectorAll('[class*="holdingAnalysis_categoryItem"]');
                        items.forEach(item => {
                            const text = item.textContent.trim();
                            const match = text.match(/(.+?)(\\d+\\.\\d+%)/);
                            if (match) {
                                result[match[1].trim()] = match[2];
                            }
                        });
                        break;
                    }
                }
                return result;
            }
        """, {})

        # === DEBT SECTOR ALLOCATION ===
        debt_sector_allocation = await self.safe_evaluate(page, """
            () => {
                const result = {};
                const headings = document.querySelectorAll('[class*="holdingAnalysis_sectionTitle"]');
                for (const h of headings) {
                    if (h.textContent.includes('Debt sector allocation')) {
                        const container = h.parentElement;
                        const items = container.querySelectorAll('[class*="holdingAnalysis_categoryItem"]');
                        items.forEach(item => {
                            const text = item.textContent.trim();
                            const match = text.match(/(.+?)(\\d+\\.\\d+%)/);
                            if (match) {
                                result[match[1].trim()] = match[2];
                            }
                        });
                        break;
                    }
                }
                return result;
            }
        """, {})

        # === PORTFOLIO COMPOSITION (Equity %, Debt %, Cash %) ===
        # Heading is "Equity / Debt / Cash split" (not "Portfolio composition")
        portfolio_composition = await self.safe_evaluate(page, """
            () => {
                const result = {};
                const sections = document.querySelectorAll('[class*="holdingAnalysis_sectionTitle"]');
                for (const h of sections) {
                    const t = h.textContent.toLowerCase();
                    if (t.includes('split') || t.includes('composition') || t.includes('asset allocation')) {
                        const container = h.parentElement;
                        const catItems = container.querySelectorAll('[class*="holdingAnalysis_categoryItem"]');
                        catItems.forEach(item => {
                            const text = item.textContent.trim();
                            const match = text.match(/(.+?)(\\d+\\.\\d+%)/);
                            if (match) {
                                result[match[1].trim().toLowerCase()] = match[2];
                            }
                        });
                        break;
                    }
                }
                return result;
            }
        """, {})

        # === EXIT LOAD, STAMP DUTY, TAX ===
        exit_load = await self.safe_evaluate(page, """
            () => {
                const rows = document.querySelectorAll('[class*="exitLoadStampDutyTax_exitLoadRow"]');
                if (rows.length > 0) {
                    // Get the most recent (first) exit load entry
                    const divs = rows[0].querySelectorAll('div');
                    if (divs.length >= 2) return divs[1].textContent.trim();
                }
                return '';
            }
        """)

        # Stamp duty and tax are inside the contentContainer sibling
        stamp_duty = await self.safe_evaluate(page, """
            () => {
                // Find the content container which has all the exit load, stamp duty, tax data
                const container = document.querySelector('[class*="exitLoadStampDutyTax_contentContainer"]');
                if (!container) return '';
                const text = container.textContent;
                // Extract stamp duty info: "Stamp duty on investment: 0.005% (from July 1st, 2020)"
                const match = text.match(/Stamp duty[^.]*(?:\\.(?!\\s*$)\\s*[^.]*)*\\./i);
                if (match) return match[0].trim();
                // Fallback: look for the pattern
                const idx = text.toLowerCase().indexOf('stamp duty');
                if (idx >= 0) return text.substring(idx, idx + 150).trim();
                return '';
            }
        """)

        tax_implication = await self.safe_evaluate(page, """
            () => {
                const container = document.querySelector('[class*="exitLoadStampDutyTax_contentContainer"]');
                if (!container) return '';
                const text = container.textContent;
                // Extract tax section
                const idx = text.toLowerCase().indexOf('tax implication');
                if (idx >= 0) return text.substring(idx).trim();
                // Fallback: look for "If you redeem"
                const idx2 = text.indexOf('If you redeem');
                if (idx2 >= 0) return text.substring(idx2).trim();
                return '';
            }
        """)

        # === INVESTMENT REQUIREMENTS ===
        investment_requirements = await self.safe_evaluate(page, """
            () => {
                const result = {};
                const allDivs = document.querySelectorAll('[class*="fundDetails_gap4"]');
                allDivs.forEach(div => {
                    const children = div.querySelectorAll('div');
                    if (children.length >= 2) {
                        const label = children[0].textContent.trim();
                        const value = children[1].textContent.trim();
                        if (label.includes('Min') && label.includes('1st')) result['minimum_first_investment'] = value;
                        else if (label.includes('Min') && label.includes('SIP')) result['minimum_sip'] = value;
                        else if (label.includes('Min') && (label.includes('2nd') || label.includes('addl'))) result['minimum_additional_investment'] = value;
                    }
                });
                return result;
            }
        """, {})

        # === FUND MANAGERS ===
        fund_managers = await self.safe_evaluate(page, """
            () => {
                const els = document.querySelectorAll('[class*="fundManagement_personName"]');
                const mgrs = [];
                els.forEach(el => mgrs.push(el.textContent.trim()));
                return mgrs.length > 0 ? mgrs.join(', ') : '';
            }
        """)

        return {
            "fund_name": fund_name,
            "source_url": url,
            "fund_managers": fund_managers,
            "fund_category": fund_category,
            "fund_sub_category": fund_sub_category,
            "risk_level": risk_level,
            "nav": nav,
            "nav_date": nav_date,
            "expense_ratio": expense_ratio,
            "minimum_sip": min_sip or investment_requirements.get("minimum_sip", ""),
            "fund_size_aum": fund_size_aum,
            "performance_metrics": {
                "three_year_annualised_return": three_year_return,
                "one_day_return": one_day_return
            },
            "historical_returns": historical_returns,
            "annualised_returns": annualised_returns,
            "holdings": holdings,
            "equity_sector_allocation": equity_sector_allocation,
            "debt_sector_allocation": debt_sector_allocation,
            "portfolio_composition": portfolio_composition,
            "investment_requirements": {
                "minimum_first_investment": investment_requirements.get("minimum_first_investment", min_sip),
                "minimum_sip": investment_requirements.get("minimum_sip", min_sip),
                "minimum_additional_investment": investment_requirements.get("minimum_additional_investment", "")
            },
            "exit_load_details": {
                "exit_load": exit_load,
                "stamp_duty": stamp_duty,
                "tax_implication": tax_implication
            }
        }

    def save_results(self):
        os.makedirs(os.path.dirname(self.output_file), exist_ok=True)
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)

async def main():
    urls_path = os.path.join(os.path.dirname(__file__), "phase1_urls.json")
    output_path = os.path.join(os.path.dirname(__file__), "output", "raw_funds.json")
    scraper = Phase1Scraper(urls_path, output_path)
    await scraper.scrape()

if __name__ == "__main__":
    asyncio.run(main())
