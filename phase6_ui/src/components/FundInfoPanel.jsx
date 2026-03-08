import { useState } from 'react';
import AttributeTabs from './AttributeTabs';

export default function FundInfoPanel({ lastResult, allFunds, selectedFundIndex, setSelectedFundIndex, isCollapsed, onToggle }) {
    const currentFund = allFunds?.[selectedFundIndex] || null;

    const [openSections, setOpenSections] = useState({
        cards: false,
        tabs: false,
        knowledge: false
    });

    const toggleSection = (section) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Featured info cards
    const infoCards = currentFund
        ? [
            { label: 'NAV', value: currentFund.nav, color: 'from-indigo-500 to-primary' },
            { label: 'Expense Ratio', value: currentFund.expense_ratio, color: 'from-accent to-blue-500' },
            { label: 'Min SIP', value: currentFund.minimum_sip, color: 'from-emerald-500 to-teal-500' },
            { label: 'AUM', value: currentFund.fund_size_aum, color: 'from-amber-500 to-orange-500' },
        ]
        : [];

    const AccordionSection = ({ title, isOpen, onToggle, children, isHighlighted }) => (
        <div className={`border rounded-[14px] overflow-hidden ${isHighlighted ? 'border-primary/20 bg-primary/5' : 'border-border bg-card shadow-sm'}`}>
            <button
                className="w-full flex justify-between items-center p-4 hover:bg-surface-alt transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    {isHighlighted && <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>}
                    <span className={`text-[11px] lg:text-[12px] font-bold uppercase tracking-wider ${isHighlighted ? 'text-primary' : 'text-text-secondary'}`}>{title}</span>
                </div>
                <span className={`text-xs ${isHighlighted ? 'text-primary' : 'text-text-secondary'}`}>{isOpen ? '▼' : '▶'}</span>
            </button>
            {isOpen && (
                <div className={`p-4 pt-2 border-t ${isHighlighted ? 'border-primary/20' : 'border-border'}`}>
                    {children}
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-surface border-border w-full relative">
            {/* Collapsible Header */}
            <div
                className={`px-4 lg:px-6 py-4 border-b border-border bg-card/80 backdrop-blur-md shrink-0 cursor-pointer flex justify-between items-center group hover:bg-surface-alt transition-colors ${isCollapsed ? 'border-b-0 h-full justify-center lg:justify-start' : ''}`}
                onClick={onToggle}
            >
                <div className="flex-1">
                    <h2 className="text-sm lg:text-xl font-bold text-text group-hover:text-primary transition-colors flex items-center gap-2">
                        Fund Explorer
                        {!isCollapsed && <span className="text-xs lg:text-sm text-text-secondary">▼</span>}
                    </h2>
                    {isCollapsed ? (
                        <p className="text-[13px] text-text-secondary mt-1 truncate max-w-[200px] lg:max-w-[180px]">
                            {currentFund?.fund_name || 'Select a fund'}
                        </p>
                    ) : (
                        <p className="text-[10px] lg:text-xs font-semibold text-text-secondary mt-1 tracking-wide uppercase">Browse structured knowledge</p>
                    )}
                </div>
                {isCollapsed && (
                    <div className="text-text-secondary group-hover:text-primary transition-colors shrink-0 ml-4">
                        <svg className="w-5 h-5 lg:hidden transform -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                        <svg className="w-5 h-5 hidden lg:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Expandable Body */}
            {!isCollapsed && (
                <div className="flex-1 overflow-y-auto px-4 lg:px-5 py-5 lg:py-6 space-y-4">
                    {/* Fund selector */}
                    {allFunds && allFunds.length > 0 && (
                        <div className="mb-4">
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

                    {/* Info cards accordion */}
                    {infoCards.length > 0 && (
                        <AccordionSection
                            title="Key Metrics"
                            isOpen={openSections.cards}
                            onToggle={() => toggleSection('cards')}
                        >
                            <div className="grid grid-cols-2 gap-3 lg:gap-4">
                                {infoCards.map((card) => (
                                    <div
                                        key={card.label}
                                        className="relative overflow-hidden rounded-[12px] lg:rounded-[14px] p-3 lg:p-4 bg-surface border border-border shadow-sm group hover:shadow-md transition-all duration-300"
                                    >
                                        <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${card.color} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                                        <p className="text-[10px] lg:text-[11px] font-bold text-text-secondary uppercase tracking-wider">{card.label}</p>
                                        <p className="text-sm lg:text-base font-bold text-text mt-1">{card.value || 'N/A'}</p>
                                    </div>
                                ))}
                            </div>
                        </AccordionSection>
                    )}

                    {/* Attribute tabs accordion */}
                    <AccordionSection
                        title="Detailed Analysis"
                        isOpen={openSections.tabs}
                        onToggle={() => toggleSection('tabs')}
                    >
                        <AttributeTabs fundData={currentFund} />
                    </AccordionSection>

                    {/* Last API result info accordion */}
                    {lastResult && (
                        <AccordionSection
                            title="Latest Extracted Knowledge"
                            isOpen={openSections.knowledge}
                            onToggle={() => toggleSection('knowledge')}
                            isHighlighted={true}
                        >
                            <p className="text-[12px] lg:text-[13px] text-text font-medium leading-relaxed">{lastResult.answer?.substring(0, 250)}{lastResult.answer?.length > 250 ? '...' : ''}</p>
                        </AccordionSection>
                    )}
                </div>
            )}
        </div>
    );
}
