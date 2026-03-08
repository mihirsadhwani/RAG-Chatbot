import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatPanel from '../components/ChatPanel';
import FundInfoPanel from '../components/FundInfoPanel';
import QuickFacts from '../components/QuickFacts';
import SavedQueries from '../components/SavedQueries';
import Documentation from '../components/Documentation';
import MutualFundsList from '../components/MutualFundsList';
import ThemeSwitcher from '../components/ThemeSwitcher';

const FUND_DATA_URL = '/fund_data.json';

export default function Dashboard() {
    const [activeSection, setActiveSection] = useState('dashboard');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [themeColor, setThemeColor] = useState('purple');
    const [lastResult, setLastResult] = useState(null);
    const [savedQueries, setSavedQueries] = useState([]);

    // Shared state for funds
    const [allFunds, setAllFunds] = useState([]);
    const [selectedFundIndex, setSelectedFundIndex] = useState(0);

    const [chatTriggerQuery, setChatTriggerQuery] = useState('');

    // Mobile states
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isFundExplorerCollapsed, setIsFundExplorerCollapsed] = useState(true);

    useEffect(() => {
        fetch(FUND_DATA_URL)
            .then((r) => r.json())
            .then((data) => setAllFunds(data))
            .catch(() => setAllFunds([]));
    }, []);

    useEffect(() => {
        const html = document.documentElement;
        if (isDarkMode) html.classList.add('dark');
        else html.classList.remove('dark');

        html.classList.remove('theme-purple', 'theme-blue', 'theme-teal');
        if (themeColor !== 'purple') html.classList.add(`theme-${themeColor}`);
    }, [isDarkMode, themeColor]);

    const handleTriggerChat = (query) => {
        setChatTriggerQuery(query);
        setActiveSection('dashboard');
    };

    const handleSaveQuery = (query, result) => {
        const newQuery = { id: Date.now(), query, result };
        setSavedQueries(prev => [...prev, newQuery]);
    };

    return (
        <div className="flex h-[100dvh] overflow-hidden text-text bg-surface transition-colors duration-300 relative">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Sidebar
                    activeSection={activeSection}
                    onSectionChange={(sec) => {
                        setActiveSection(sec);
                        setIsMobileMenuOpen(false);
                    }}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                />
            </div>

            {/* Main Content Area (Chat + Explorer) */}
            <div className="flex-1 flex flex-col lg:flex-row min-w-0 overflow-hidden relative">

                <main className="flex-1 flex flex-col min-w-0 border-b lg:border-b-0 lg:border-r border-border transition-colors duration-300">
                    <header className="px-4 md:px-6 py-4 border-b border-border bg-card/90 backdrop-blur-md flex justify-between items-center z-20 shrink-0 gap-3">
                        <div className="flex items-center gap-3 w-full md:w-auto overflow-hidden">
                            <button
                                className="lg:hidden p-2 -ml-2 text-text-secondary hover:text-text rounded-lg hover:bg-surface-alt"
                                onClick={() => setIsMobileMenuOpen(true)}
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <h2 className="text-lg md:text-[22px] font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary-light to-accent truncate">
                                {activeSection === 'dashboard' ? 'AI Chat Assistant' :
                                    activeSection === 'funds' ? 'Mutual Funds Knowledge Base' :
                                        activeSection === 'facts' ? 'Quick Facts' :
                                            activeSection === 'saved' ? 'Saved Queries' : 'Documentation'}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4 shrink-0">
                            <ThemeSwitcher
                                isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                                theme={themeColor} onThemeChange={setThemeColor}
                            />
                        </div>
                    </header>

                    <div className="flex-1 overflow-hidden relative flex flex-col">
                        {activeSection === 'dashboard' && (
                            <ChatPanel
                                onResultReceived={setLastResult}
                                onSaveQuery={handleSaveQuery}
                                triggerQuery={chatTriggerQuery}
                                onClearTrigger={() => setChatTriggerQuery('')}
                            />
                        )}
                        {activeSection === 'funds' && (
                            <MutualFundsList
                                funds={allFunds}
                                selectedIndex={selectedFundIndex}
                                onSelectFund={(idx) => {
                                    setSelectedFundIndex(idx);
                                    setActiveSection('dashboard');
                                }}
                            />
                        )}
                        {activeSection === 'facts' && (
                            <QuickFacts onQuerySelect={handleTriggerChat} />
                        )}
                        {activeSection === 'saved' && (
                            <SavedQueries queries={savedQueries} onQuerySelect={handleTriggerChat} />
                        )}
                        {activeSection === 'docs' && (
                            <Documentation />
                        )}
                    </div>
                </main>

                <aside className={`
                    bg-surface shrink-0 flex flex-col transition-all duration-300 ease-in-out
                    ${activeSection !== 'dashboard' ? 'hidden lg:flex' : 'flex'}
                    ${isFundExplorerCollapsed
                        ? 'h-[72px] lg:h-auto lg:w-[220px]'
                        : 'form-expanded h-[60vh] lg:h-auto lg:w-[380px] lg:max-w-[400px]'}
                `}>
                    <FundInfoPanel
                        lastResult={lastResult}
                        allFunds={allFunds}
                        selectedFundIndex={selectedFundIndex}
                        setSelectedFundIndex={setSelectedFundIndex}
                        isCollapsed={isFundExplorerCollapsed}
                        onToggle={() => setIsFundExplorerCollapsed(!isFundExplorerCollapsed)}
                    />
                </aside>

            </div>
        </div>
    );
}
