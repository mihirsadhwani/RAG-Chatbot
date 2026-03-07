import { useState } from 'react';

const FUNDS = [
    'HDFC Balanced Advantage Fund',
    'HDFC Flexi Cap Fund',
    'HDFC Mid-Cap Opportunities Fund',
    'HDFC Top 100 Fund',
    'HDFC Small Cap Fund',
];

const ATTRIBUTES = [
    'Expense Ratio',
    'Minimum SIP',
    'Exit Load',
    'Fund Size',
    'Risk Level',
    'Benchmark',
    'NAV',
    'Tax Implication',
    'Fund Manager',
];

export default function QueryDropdown({ onQueryGenerated }) {
    const [selectedAttr, setSelectedAttr] = useState('');
    const [selectedFund, setSelectedFund] = useState('');

    const handleGenerate = () => {
        if (!selectedAttr || !selectedFund) return;
        const query = `What is the ${selectedAttr.toLowerCase()} of ${selectedFund}?`;
        onQueryGenerated(query);
        setSelectedAttr('');
        setSelectedFund('');
    };

    return (
        <div className="bg-card rounded-2xl border border-border p-4 mb-4 shadow-sm">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Select a mutual fund fact</p>

            <div className="flex gap-2 items-end">
                {/* Attribute dropdown */}
                <div className="flex-1">
                    <select
                        value={selectedAttr}
                        onChange={(e) => setSelectedAttr(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer"
                    >
                        <option value="">Choose attribute...</option>
                        {ATTRIBUTES.map((a) => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                </div>

                {/* Fund dropdown */}
                <div className="flex-1">
                    <select
                        value={selectedFund}
                        onChange={(e) => setSelectedFund(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer"
                    >
                        <option value="">Choose fund...</option>
                        {FUNDS.map((f) => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                </div>

                {/* Generate button */}
                <button
                    onClick={handleGenerate}
                    disabled={!selectedAttr || !selectedFund}
                    className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer whitespace-nowrap"
                >
                    Ask →
                </button>
            </div>
        </div>
    );
}
