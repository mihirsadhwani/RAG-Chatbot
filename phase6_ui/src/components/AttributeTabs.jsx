import { useState } from 'react';

const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'returns', label: 'Returns' },
    { id: 'holdings', label: 'Holdings' },
    { id: 'sectors', label: 'Sectors' },
    { id: 'investment', label: 'Investment' },
    { id: 'tax', label: 'Tax' },
];

export default function AttributeTabs({ fundData }) {
    const [activeTab, setActiveTab] = useState('overview');

    if (!fundData) {
        return (
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <p className="text-sm text-text-secondary text-center py-8">
                    Ask a question to see detailed fund attributes here.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-border overflow-x-auto">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border-b-2
              ${activeTab === tab.id
                                ? 'text-primary border-primary bg-primary/5'
                                : 'text-text-secondary border-transparent hover:text-text hover:bg-surface-alt'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="p-4">
                {activeTab === 'overview' && <OverviewTab data={fundData} />}
                {activeTab === 'returns' && <ReturnsTab data={fundData} />}
                {activeTab === 'holdings' && <HoldingsTab data={fundData} />}
                {activeTab === 'sectors' && <SectorsTab data={fundData} />}
                {activeTab === 'investment' && <InvestmentTab data={fundData} />}
                {activeTab === 'tax' && <TaxTab data={fundData} />}
            </div>
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0">
            <span className="text-xs text-text-secondary">{label}</span>
            <span className="text-sm font-semibold text-text">{value || 'N/A'}</span>
        </div>
    );
}

function OverviewTab({ data }) {
    return (
        <div className="space-y-1">
            <InfoRow label="NAV" value={data.nav} />
            <InfoRow label="Expense Ratio" value={data.expense_ratio} />
            <InfoRow label="Minimum SIP" value={data.minimum_sip} />
            <InfoRow label="Fund Size (AUM)" value={data.fund_size_aum} />
            <InfoRow label="Risk Level" value={data.risk_level} />
            <InfoRow label="Benchmark" value={data.benchmark} />
            <InfoRow label="Fund Category" value={data.fund_category} />
        </div>
    );
}

function ReturnsTab({ data }) {
    const hist = data.historical_returns || {};
    const annualised = data.annualised_returns || {};
    return (
        <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Historical Returns</p>
            <div className="space-y-1 mb-4">
                <InfoRow label="1 Year" value={hist['1_year_return']} />
                <InfoRow label="3 Years" value={hist['3_years_return']} />
                <InfoRow label="5 Years" value={hist['5_years_return']} />
                <InfoRow label="10 Years" value={hist['10_years_return']} />
            </div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Annualised Returns</p>
            <div className="space-y-1">
                {Object.entries(annualised).length > 0 ? (
                    Object.entries(annualised).map(([k, v]) => (
                        <InfoRow key={k} label={k.replace(/_/g, ' ')} value={v} />
                    ))
                ) : (
                    <p className="text-xs text-text-secondary py-2">No annualised return data fetched yet.</p>
                )}
            </div>
        </div>
    );
}

function HoldingsTab({ data }) {
    const holdings = data.holdings || [];
    if (holdings.length === 0) return <p className="text-xs text-text-secondary py-4">No holdings data available.</p>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="text-left text-text-secondary border-b border-border">
                        <th className="py-2 pr-2">Company</th>
                        <th className="py-2 pr-2">Sector</th>
                        <th className="py-2 text-right">Allocation</th>
                    </tr>
                </thead>
                <tbody>
                    {holdings.map((h, i) => (
                        <tr key={i} className="border-b border-border/30 hover:bg-surface-alt transition-colors">
                            <td className="py-2.5 pr-2 font-medium text-text">{h.company_name}</td>
                            <td className="py-2.5 pr-2 text-text-secondary">{h.sector || '—'}</td>
                            <td className="py-2.5 text-right font-semibold text-primary">{h.allocation_percentage}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function SectorsTab({ data }) {
    const sectors = data.equity_sector_allocation || {};
    const entries = Object.entries(sectors);
    if (entries.length === 0) return <p className="text-xs text-text-secondary py-4">No sector data available.</p>;
    return (
        <div className="space-y-2">
            {entries.map(([name, pct]) => {
                const numPct = parseFloat(pct) || 0;
                return (
                    <div key={name}>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-text">{name}</span>
                            <span className="font-semibold text-primary">{pct}</span>
                        </div>
                        <div className="w-full bg-surface-alt rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(numPct, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function InvestmentTab({ data }) {
    const exit = data.exit_load_details || {};
    return (
        <div className="space-y-1">
            <InfoRow label="Minimum SIP" value={data.minimum_sip} />
            <InfoRow label="Minimum Lumpsum" value={data.minimum_lumpsum} />
            <InfoRow label="Exit Load" value={exit.exit_load} />
            <InfoRow label="Stamp Duty" value={exit.stamp_duty} />
        </div>
    );
}

function TaxTab({ data }) {
    const exit = data.exit_load_details || {};
    return (
        <div className="space-y-1">
            <InfoRow label="Tax Implication" value={exit.tax_implication} />
            <InfoRow label="Stamp Duty" value={exit.stamp_duty} />
        </div>
    );
}
