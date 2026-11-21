import { useState, useEffect } from 'react';
import { Menu, PanelRightOpen, PanelRightClose } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import OverviewDashboard from '../components/OverviewDashboard';
import ChatPanel from '../components/ChatPanel';
import FundInfoPanel from '../components/FundInfoPanel';
import QuickFacts from '../components/QuickFacts';
import SavedQueries from '../components/SavedQueries';
import Documentation from '../components/Documentation';
import MutualFundsList from '../components/MutualFundsList';
import ComparePanel from '../components/ComparePanel';
import SipCalculator from '../components/SipCalculator';
import AnalyticsPanel from '../components/AnalyticsPanel';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { fetchFunds, healthCheck } from '../services/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const SECTION_TITLES = {
  overview: 'Dashboard Overview',
  dashboard: 'AI Chat Assistant',
  funds: 'Mutual Funds Knowledge Base',
  compare: 'Compare Schemes',
  sip: 'SIP & Expense Ratio Calculator',
  analytics: 'AI Quality & Analytics',
  facts: 'Quick Facts & Prompts',
  saved: 'Saved Queries',
  docs: 'Documentation',
};

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeColor, setThemeColor] = useState('blue');
  const [lastResult, setLastResult] = useState(null);
  const [savedQueries, setSavedQueries] = useState([]);
  const [allFunds, setAllFunds] = useState([]);
  const [selectedFundIndex, setSelectedFundIndex] = useState(0);
  const [chatTriggerQuery, setChatTriggerQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFundExplorerCollapsed, setIsFundExplorerCollapsed] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    let timer;
    const loadInitial = async () => {
      try {
        const [fundsData, health] = await Promise.all([
          fetchFunds(),
          healthCheck().catch(() => null),
        ]);
        if (Array.isArray(fundsData) && fundsData.length > 0) {
          setAllFunds(fundsData);
        }
        const ok = health?.status === 'ok';
        setApiOnline(ok);
        if (!ok || !fundsData?.length) {
          timer = setTimeout(loadInitial, 3000);
        }
      } catch {
        setApiOnline(false);
        timer = setTimeout(loadInitial, 3000);
      }
    };
    loadInitial();
    return () => clearTimeout(timer);
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
    setSavedQueries((prev) => [newQuery, ...prev]);
  };

  const handleRemoveSavedQuery = (id) => {
    setSavedQueries((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className="apple-shell flex h-[100dvh] overflow-hidden text-foreground">
      {/* Mobile Sidebar Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div
          className={`fixed inset-y-0 left-0 z-50 p-3 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          activeSection={activeSection}
          onSectionChange={(sec) => {
            setActiveSection(sec);
            setIsMobileMenuOpen(false);
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          savedCount={savedQueries.length}
          fundsCount={allFunds.length}
          apiOnline={apiOnline}
        />
      </div>

      {/* Main Content + Right Explorer */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Top Bar */}
          <header className="glass-toolbar relative z-30 mx-3 mt-3 h-[60px] rounded-2xl px-4 md:px-6 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden shrink-0"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2.5 min-w-0">
                <h2 className="text-base md:text-lg font-semibold tracking-tight text-foreground truncate">
                  {SECTION_TITLES[activeSection] || 'Dashboard'}
                </h2>
                <Badge variant={apiOnline ? 'success' : 'warning'} className="hidden sm:inline-flex">
                  {apiOnline ? 'KB Connected' : 'Offline'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <ThemeSwitcher
                isDarkMode={isDarkMode}
                onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                theme={themeColor}
                onThemeChange={setThemeColor}
              />
              <Button
                variant="outline"
                size="icon"
                className="hidden lg:inline-flex"
                onClick={() => setIsFundExplorerCollapsed(!isFundExplorerCollapsed)}
                title={isFundExplorerCollapsed ? 'Show Fund Explorer' : 'Hide Fund Explorer'}
                aria-label="Toggle Fund Explorer"
              >
                {isFundExplorerCollapsed ? (
                  <PanelRightOpen className="w-4 h-4" />
                ) : (
                  <PanelRightClose className="w-4 h-4" />
                )}
              </Button>
            </div>
          </header>

          {/* Active View */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-1 pb-2">
            {activeSection === 'overview' && (
              <OverviewDashboard
                allFunds={allFunds}
                selectedFundIndex={selectedFundIndex}
                onSelectFund={setSelectedFundIndex}
                onAskAI={handleTriggerChat}
                onNavigate={setActiveSection}
              />
            )}
            {activeSection === 'dashboard' && (
              <ChatPanel
                allFunds={allFunds}
                onResultReceived={(res) => {
                  setLastResult(res);
                  setApiOnline(true);
                }}
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
                  setIsFundExplorerCollapsed(false);
                }}
                onAskAI={handleTriggerChat}
              />
            )}
            {activeSection === 'compare' && <ComparePanel funds={allFunds} />}
            {activeSection === 'sip' && <SipCalculator funds={allFunds} />}
            {activeSection === 'analytics' && <AnalyticsPanel />}
            {activeSection === 'facts' && <QuickFacts funds={allFunds} onQuerySelect={handleTriggerChat} />}
            {activeSection === 'saved' && (
              <SavedQueries
                queries={savedQueries}
                onQuerySelect={handleTriggerChat}
                onRemoveQuery={handleRemoveSavedQuery}
              />
            )}
            {activeSection === 'docs' && <Documentation />}
          </div>
        </main>

        {/* Right Fund Explorer */}
        <aside
          className={`glass-panel hidden lg:flex m-3 ml-0 overflow-hidden rounded-2xl shrink-0 transition-all duration-300 ${
            isFundExplorerCollapsed ? 'w-14' : 'w-[360px]'
          }`}
        >
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
