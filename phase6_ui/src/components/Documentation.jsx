export default function Documentation() {
    return (
        <div className="flex-1 overflow-y-auto p-6 bg-surface h-full">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-text mb-2">System Documentation & Guardrails</h2>
                    <p className="text-sm text-text-secondary">Understanding the Mutual Fund RAG Architectures and Boundaries.</p>
                </div>

                <div className="bg-card border-l-4 border-primary rounded-r-2xl p-6 shadow-sm border-t border-r border-b border-border">
                    <h3 className="text-lg font-bold text-text mb-2">Scope of Knowledge</h3>
                    <p className="text-sm text-text-secondary leading-relaxed mb-4">
                        This AI Assistant runs on a locally hosted Retrieval-Augmented Generation (RAG) backend utilizing <strong>Google Gemini</strong> models via vector search. It strictly answers factual questions exclusively regarding 5 specifically verified HDFC index and actively managed funds.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                        <h3 className="text-base font-bold text-text mb-3 flex items-center gap-2"><span className="text-success text-xl">✓</span> Supported Queries</h3>
                        <ul className="space-y-2 text-sm text-text-secondary">
                            <li className="flex gap-2"><span>•</span> Structured NAV and Sizes</li>
                            <li className="flex gap-2"><span>•</span> Investment & SIP Minimums</li>
                            <li className="flex gap-2"><span>•</span> Historic & Annualised Returns</li>
                            <li className="flex gap-2"><span>•</span> Detailed Equity Holdings</li>
                            <li className="flex gap-2"><span>•</span> Exit Loads and Tax Details</li>
                        </ul>
                    </div>

                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                        <h3 className="text-base font-bold text-text mb-3 flex items-center gap-2"><span className="text-warning text-xl">⊗</span> Blocked Topics</h3>
                        <ul className="space-y-2 text-sm text-text-secondary">
                            <li className="flex gap-2 text-warning/90"><span>•</span> Direct Investment Advice ("Should I invest?")</li>
                            <li className="flex gap-2 text-warning/90"><span>•</span> Comparative Opinions ("Which fund is better?")</li>
                            <li className="flex gap-2 text-warning/90"><span>•</span> Non-HDFC Mutual Funds (e.g. SBI, ICICI)</li>
                            <li className="flex gap-2 text-warning/90"><span>•</span> Live Stock Trading Data</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
