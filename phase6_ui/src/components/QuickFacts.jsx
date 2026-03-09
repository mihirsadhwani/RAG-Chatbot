export default function QuickFacts({ onQuerySelect }) {
    const categories = [
        {
            title: "Cost & Expense Ratings",
            icon: "💸",
            queries: [
                "Expense ratio of HDFC Flexi Cap Direct Plan Growth",
                "Expense ratio of HDFC Small Cap Fund Direct Growth",
                "Exit load of HDFC Large Cap Fund Direct Growth",
                "Stamp duty for HDFC Balanced Advantage Fund Direct Growth"
            ]
        },
        {
            title: "Investment Needs",
            icon: "📈",
            queries: [
                "Minimum SIP requirement for HDFC Mid Cap Fund Direct Growth",
                "Minimum Lumpsum of HDFC Small Cap Fund Direct Growth",
                "Minimum SIP of HDFC Flexi Cap Direct Plan Growth",
                "Tax implications for HDFC Balanced Advantage Fund Direct Growth"
            ]
        },
        {
            title: "Performance & Structure",
            icon: "📊",
            queries: [
                "What is the benchmark of HDFC Large Cap Fund Direct Growth?",
                "Fund size of HDFC Mid Cap Fund Direct Growth",
                "Current NAV of HDFC Flexi Cap Direct Plan Growth",
                "Risk level of HDFC Small Cap Fund Direct Growth"
            ]
        }
    ];

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-surface h-full">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-text mb-2">Pre-built Factual Queries</h2>
                    <p className="text-sm text-text-secondary">Click any question below to immediately send it to the Assistant and retrieve knowledge.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {categories.map((cat, idx) => (
                        <div key={idx} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                            <h3 className="text-base font-bold text-text flex items-center gap-2 mb-4 tracking-tight">
                                <span className="text-xl bg-surface-alt p-1.5 rounded-lg border border-border/50 shadow-sm">{cat.icon}</span> {cat.title}
                            </h3>
                            <ul className="space-y-3">
                                {cat.queries.map((q, qIdx) => (
                                    <li key={qIdx}>
                                        <button
                                            onClick={() => onQuerySelect(q)}
                                            className="w-full text-left flex items-start p-3 bg-surface-alt hover:bg-primary/5 hover:border-primary/40 border border-transparent rounded-xl text-sm font-medium text-text-secondary hover:text-primary transition-all group"
                                        >
                                            <span className="mr-3 opacity-40 group-hover:opacity-100 group-hover:text-primary transition-opacity translate-y-0.5 mt-0.5">●</span>
                                            <span className="leading-tight">{q}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
