export default function MutualFundsList({ funds, selectedIndex, onSelectFund }) {
    if (!funds || funds.length === 0) {
        return (
            <div className="flex-1 p-8 text-center text-text-secondary">
                <p>Loading Mutual Funds from Knowledge Base...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-surface h-full">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-text mb-2">Available HDFC Schemes</h2>
                    <p className="text-sm text-text-secondary">Click any mutual fund below to view its attributes in the right-side Explorer panel.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {funds.map((fund, idx) => (
                        <button
                            key={idx}
                            onClick={() => onSelectFund(idx)}
                            className={`text-left p-5 rounded-2xl border transition-all duration-300 shadow-sm cursor-pointer group hover:shadow-md
                ${selectedIndex === idx
                                    ? 'border-primary bg-primary/10 ring-1 ring-primary w-full h-full relative'
                                    : 'bg-card border-border hover:border-primary/50'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className={`font-semibold text-base ${selectedIndex === idx ? 'text-primary-dark' : 'text-text group-hover:text-primary transition-colors'}`}>
                                    {fund.fund_name}
                                </h3>
                                {selectedIndex === idx && (
                                    <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white shadow-sm">
                                        ✓
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-text-secondary line-clamp-2 mt-2 leading-relaxed opacity-80">{fund.fund_category} | {fund.risk_level}</p>

                            <div className="flex flex-wrap gap-2 mt-4 mt-auto">
                                <span className="px-2 py-1 rounded bg-surface-alt text-[10px] font-medium text-text-secondary border border-border/50">NAV: {fund.nav || 'N/A'}</span>
                                <span className="px-2 py-1 rounded bg-surface-alt text-[10px] font-medium text-text-secondary border border-border/50">Min SIP: {fund.minimum_sip || 'N/A'}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
