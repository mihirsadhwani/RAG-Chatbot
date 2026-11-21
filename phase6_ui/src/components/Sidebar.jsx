import {
  LayoutDashboard,
  MessageSquareText,
  PieChart,
  Zap,
  Bookmark,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  TrendingUp,
  Database,
  GitCompare,
  Calculator,
  Activity,
} from 'lucide-react';
import { cn } from '../lib/utils';

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'dashboard', label: 'AI Chat Assistant', icon: MessageSquareText },
      { id: 'funds', label: 'Mutual Funds', icon: PieChart },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'compare', label: 'Compare Schemes', icon: GitCompare },
      { id: 'sip', label: 'SIP Calculator', icon: Calculator },
      { id: 'analytics', label: 'AI Analytics', icon: Activity },
    ],
  },
  {
    label: 'Resources',
    items: [
      { id: 'facts', label: 'Quick Facts', icon: Zap },
      { id: 'saved', label: 'Saved Queries', icon: Bookmark },
      { id: 'docs', label: 'Documentation', icon: BookOpen },
    ],
  },
];

export default function Sidebar({
  activeSection,
  onSectionChange,
  isCollapsed,
  onToggleCollapse,
  savedCount = 0,
  fundsCount = 5,
  apiOnline = true,
}) {
  return (
    <aside
      className={cn(
        'glass-sidebar h-full rounded-2xl text-sidebar-foreground flex flex-col shrink-0 border transition-all duration-300 ease-in-out select-none',
        isCollapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-[76px] px-4 border-b border-sidebar-border flex items-center justify-between shrink-0">
        <div className={cn('flex items-center gap-3 min-w-0', isCollapsed && 'justify-center w-full')}>
          <div className="w-10 h-10 rounded-[14px] bg-primary flex items-center justify-center text-primary-foreground shadow-[0_7px_18px_rgba(0,122,255,0.24)] shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-tight text-sidebar-foreground truncate">
                Mutual Fund Advisor
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                Banking & Investment Intelligence
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    'group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 cursor-pointer',
                    isActive
                      ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(0,122,255,0.1)]'
                      : 'text-sidebar-foreground/75 hover:bg-sidebar-muted hover:text-sidebar-foreground',
                    isCollapsed && 'justify-center px-0'
                  )}
                >
                  <Icon className={cn('w-[17px] h-[17px] shrink-0', isActive ? 'text-primary' : 'text-sidebar-foreground/50 group-hover:text-primary')} />
                  {!isCollapsed && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}
                  {!isCollapsed && item.id === 'saved' && savedCount > 0 && (
                    <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {savedCount}
                    </span>
                  )}
                  {!isCollapsed && item.id === 'funds' && fundsCount > 0 && (
                    <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {fundsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Knowledge Base Status & Collapse Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2 shrink-0">
        {!isCollapsed && (
          <div className="glass-control rounded-xl px-3 py-3 flex items-center gap-2.5">
            <Database className="w-4 h-4 text-primary/75 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    apiOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.45)]' : 'bg-amber-400'
                  )}
                />
                <span className="text-xs font-medium text-sidebar-foreground truncate">
                  {apiOnline ? 'Knowledge base active' : 'Connecting...'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {fundsCount} schemes indexed
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={cn(
            'hidden lg:flex w-full items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-sidebar-muted hover:text-sidebar-foreground transition-colors cursor-pointer',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {!isCollapsed && <span>Collapse sidebar</span>}
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
