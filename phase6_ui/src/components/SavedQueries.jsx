export default function SavedQueries({ queries, onQuerySelect }) {
    if (!queries || queries.length === 0) {
        return (
            <div className="flex-1 p-8 text-center text-text-secondary h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center text-2xl mb-4 border border-border">💾</div>
                <p className="font-medium text-text">No saved queries yet</p>
                <p className="text-sm mt-1">Click the save icon (💾) next to any chat response to save it here.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-surface h-full">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="mb-8 border-b border-border pb-4">
                    <h2 className="text-2xl font-bold text-text mb-2">Saved Queries</h2>
                    <p className="text-sm text-text-secondary">Your securely saved factual responses.</p>
                </div>

                <div className="space-y-4">
                    {queries.map((q) => (
                        <div key={q.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <button
                                    onClick={() => onQuerySelect(q.query)}
                                    className="text-primary font-semibold text-sm hover:underline text-left"
                                >
                                    Q: {q.query}
                                </button>
                                <span className="text-[10px] text-text-secondary">{new Date(q.id).toLocaleTimeString()}</span>
                            </div>
                            <div className="bg-surface-alt p-4 rounded-xl text-sm text-text border border-border/50">
                                <p className="whitespace-pre-wrap leading-relaxed">{q.result?.answer || q.result}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
