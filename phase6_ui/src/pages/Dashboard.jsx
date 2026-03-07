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

    // Focus a specific query from other panels to chat
    const [chatTriggerQuery, setChatTriggerQuery] = useState('');

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
        <div className="flex h-screen overflow-hidden text-text bg-surface transition-colors duration-300">
            <Sidebar
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            <main className="flex-1 flex flex-col min-w-0 border-r border-border transition-colors duration-300">
                <header className="px-6 py-4 border-b border-border bg-card/90 backdrop-blur-md flex justify-between items-center z-20 shrink-0">
                    <div>
                        <h2 className="text-[22px] font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary-light to-accent">
                            {activeSection === 'dashboard' ? 'AI Chat Assistant' :
                                activeSection === 'funds' ? 'Mutual Funds Knowledge Base' :
                                    activeSection === 'facts' ? 'Quick Facts' :
                                        activeSection === 'saved' ? 'Saved Queries' : 'Documentation & Scope'}
                        </h2>
                    </div>
                    <ThemeSwitcher
                        isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                        theme={themeColor} onThemeChange={setThemeColor}
                    />
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
                                setActiveSection('dashboard'); // Auto return to chat or remain? Let's remain.
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

            <aside className={`w-[380px] flex flex-col bg-surface shrink-0 transition-colors duration-300 ${isSidebarCollapsed ? '' : 'hidden xl:flex'}`}>
                <FundInfoPanel
                    lastResult={lastResult}
                    allFunds={allFunds}
                    selectedFundIndex={selectedFundIndex}
                    setSelectedFundIndex={setSelectedFundIndex}
                />
            </aside>
        </div>
    );
}
