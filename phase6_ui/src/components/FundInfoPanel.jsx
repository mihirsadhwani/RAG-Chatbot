import AttributeTabs from './AttributeTabs';

export default function FundInfoPanel({ lastResult, allFunds, selectedFundIndex, setSelectedFundIndex }) {
    const currentFund = allFunds?.[selectedFundIndex] || null;

    // Featured info cards
    const infoCards = currentFund
        ? [
            { label: 'NAV', value: currentFund.nav, color: 'from-indigo-500 to-primary' },
            { label: 'Expense Ratio', value: currentFund.expense_ratio, color: 'from-accent to-blue-500' },
            { label: 'Min SIP', value: currentFund.minimum_sip, color: 'from-emerald-500 to-teal-500' },
            { label: 'AUM', value: currentFund.fund_size_aum, color: 'from-amber-500 to-orange-500' },
        ]
        : [];

    return (
        <div className="flex flex-col h-full bg-surface border-l border-border">
            {/* Header */}
            <div className="px-6 py-5 border-b border-border bg-card/80 backdrop-blur-md shrink-0">
                <h2 className="text-xl font-bold text-text">Fund Explorer</h2>
                <p className="text-xs font-semibold text-text-secondary mt-1 tracking-wide uppercase">Browse structured knowledge</p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
                {/* Fund selector */}
                {allFunds && allFunds.length > 0 && (
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase mb-2 ml-1">Select Highlighted Fund</label>
                        <select
                            value={selectedFundIndex}
                            onChange={(e) => setSelectedFundIndex(Number(e.target.value))}
                            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-card text-[15px] font-semibold focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer shadow-sm appearance-none"
                        >
                            {allFunds.map((f, i) => (
                                <option key={i} value={i}>{f.fund_name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Info cards grid */}
                {infoCards.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                        {infoCards.map((card) => (
                            <div
                                key={card.label}
                                className="relative overflow-hidden rounded-[18px] p-5 bg-card border border-border shadow-sm group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                            >
                                <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${card.color} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                                <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">{card.label}</p>
                                <p className="text-lg font-bold text-text mt-1.5">{card.value || 'N/A'}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Attribute tabs */}
                <AttributeTabs fundData={currentFund} />

                {/* Last API result info */}
                {lastResult && (
                    <div className="bg-primary/5 border border-primary/20 rounded-[20px] p-5 mt-auto">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                            <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Latest Extracted Knowledge</p>
                        </div>
                        <p className="text-[13px] text-text font-medium leading-relaxed">{lastResult.answer?.substring(0, 250)}{lastResult.answer?.length > 250 ? '...' : ''}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
