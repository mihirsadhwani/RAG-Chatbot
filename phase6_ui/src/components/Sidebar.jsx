const NAV_ITEMS = [
    { id: 'dashboard', label: 'Chat Assistant', icon: '💬' },
    { id: 'funds', label: 'Mutual Funds', icon: '💰' },
    { id: 'facts', label: 'Quick Facts', icon: '⚡' },
    { id: 'saved', label: 'Saved Queries', icon: '💾' },
    { id: 'docs', label: 'Documentation', icon: '📄' },
];

export default function Sidebar({ activeSection, onSectionChange, isCollapsed, onToggleCollapse }) {
    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} h-full bg-sidebar flex flex-col shrink-0 transition-all duration-300 relative border-r border-border/10 overflow-hidden`}>
            {/* Brand */}
            <div className="p-4 border-b border-white/5 h-20 flex items-center shrink-0">
                <div className={`flex items-center gap-3 w-full ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary-light to-accent flex items-center justify-center text-white font-bold text-sm shadow-md">
                        MF
                    </div>
                    {!isCollapsed && (
                        <div className="transition-opacity duration-300 whitespace-nowrap">
                            <h1 className="text-white font-bold text-lg leading-tight">MF Advisor</h1>
                            <p className="text-sidebar-text text-xs opacity-75">RAG Chatbot</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1 mt-2">
                {NAV_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onSectionChange(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-3 lg:py-3.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border border-transparent
              ${activeSection === item.id
                                ? 'bg-primary border-primary-light/30 text-white shadow-md shadow-primary/20'
                                : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white hover:border-white/10'
                            } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
                        title={isCollapsed ? item.label : ''}
                    >
                        <span className="text-xl shrink-0 leading-none">{item.icon}</span>
                        {!isCollapsed && <span className="whitespace-nowrap truncate">{item.label}</span>}
                    </button>
                ))}
            </nav>

            {/* Footer / Toggle */}
            <div className="hidden lg:block p-3 border-t border-white/5 shrink-0">
                <button
                    onClick={onToggleCollapse}
                    className="w-full flex items-center justify-center py-2.5 rounded-lg text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-colors cursor-pointer border border-transparent hover:border-white/10"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? '►' : '◄ Collapse'}
                </button>
            </div>
        </aside>
    );
}
