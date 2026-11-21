import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Database,
  Percent,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  MessageSquareText,
  IndianRupee,
  ShieldAlert,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';

const CHART_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

function parsePercent(val) {
  if (!val) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(num) ? num : 0;
}

function shortFundName(name = '') {
  return name
    .replace('HDFC ', '')
    .replace(' Fund Direct Growth', '')
    .replace(' Direct Plan Growth', '');
}

export default function OverviewDashboard({
  allFunds = [],
  selectedFundIndex = 0,
  onSelectFund,
  onAskAI,
  onNavigate,
}) {
  const [quickQuestion, setQuickQuestion] = useState('');

  const selectedFund = allFunds[selectedFundIndex] || allFunds[0] || null;

  const avgExpense = useMemo(() => {
    if (!allFunds.length) return '—';
    const vals = allFunds.map((f) => parsePercent(f.expense_ratio)).filter((n) => n > 0);
    if (!vals.length) return '—';
    return `${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)}%`;
  }, [allFunds]);

  const topReturnFund = useMemo(() => {
    if (!allFunds.length) return null;
    let best = null;
    let bestVal = -Infinity;
    for (const f of allFunds) {
      const r3 = parsePercent(f.annualised_returns?.fund_return_3y || f.historical_returns?.['3_years_return']);
      if (r3 > bestVal) {
        bestVal = r3;
        best = { name: shortFundName(f.fund_name), value: `${r3.toFixed(2)}%` };
      }
    }
    return best;
  }, [allFunds]);

  const returnsChartData = useMemo(() => {
    return allFunds.map((f) => {
      const ann = f.annualised_returns || {};
      const hist = f.historical_returns || {};
      return {
        name: shortFundName(f.fund_name),
        '3Y': parsePercent(ann.fund_return_3y || hist['3_years_return']),
        '5Y': parsePercent(ann.fund_return_5y || hist['5_years_return']),
        '10Y': parsePercent(ann.fund_return_10y || hist['10_years_return']),
      };
    });
  }, [allFunds]);

  const sectorChartData = useMemo(() => {
    const sectors = selectedFund?.equity_sector_allocation || {};
    if (Array.isArray(sectors)) {
      return sectors.slice(0, 6).map((s) => ({
        name: s.sector,
        value: parsePercent(s.percentage),
      }));
    }
    return Object.entries(sectors)
      .slice(0, 6)
      .map(([sector, pct]) => ({
        name: sector,
        value: parsePercent(pct),
      }));
  }, [selectedFund]);

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (!quickQuestion.trim()) return;
    onAskAI(quickQuestion.trim());
    setQuickQuestion('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-transparent">
      {/* Top Quick-Ask Banner */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-card to-accent/5">
        <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="info">
                <Sparkles className="w-3 h-3" />
                Gemini RAG Knowledge Base
              </Badge>
              <span className="text-xs text-muted-foreground">
                Grounded on {allFunds.length} indexed schemes across five fund houses
              </span>
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Mutual Fund Banking &amp; AI Intelligence
            </h3>
            <p className="text-sm text-muted-foreground">
              Explore live scheme metrics, compare historical returns, or ask the RAG assistant any factual question.
            </p>
          </div>

          <form onSubmit={handleQuickSubmit} className="flex items-center gap-2 w-full lg:w-[420px] shrink-0">
            <Input
              value={quickQuestion}
              onChange={(e) => setQuickQuestion(e.target.value)}
              placeholder="Ask e.g. What is the expense ratio of SBI Mid Cap?"
              className="bg-card"
            />
            <Button type="submit" disabled={!quickQuestion.trim()}>
              <Send className="w-4 h-4" />
              Ask
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Indexed Schemes
            </CardTitle>
            <Database className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{allFunds.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Direct Growth schemes in KB
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Avg. Expense Ratio
            </CardTitle>
            <Percent className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{avgExpense}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all tracked schemes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Top 3Y Return
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {topReturnFund ? topReturnFund.value : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {topReturnFund ? topReturnFund.name : 'Loading...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Selected Fund NAV
            </CardTitle>
            <IndianRupee className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {selectedFund?.nav || '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {selectedFund ? shortFundName(selectedFund.fund_name) : 'Select a fund'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Annualised Returns Comparison (%)</CardTitle>
              <CardDescription>1-Year, 3-Year, and 5-Year performance across indexed schemes</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate('funds')}>
              All Schemes
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="h-[290px]">
            {returnsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={returnsChartData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-col)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} unit="%" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--card-bg)',
                      borderColor: 'var(--border-col)',
                      borderRadius: '0.75rem',
                      color: 'var(--fg)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="3Y" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="5Y" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="10Y" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Loading chart data...
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Sector Allocation</CardTitle>
            <CardDescription className="truncate">
              {selectedFund ? shortFundName(selectedFund.fund_name) : 'Selected fund'}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[290px] flex flex-col">
            {sectorChartData.length > 0 ? (
              <>
                <div className="h-[175px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={sectorChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {sectorChartData.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val) => `${val}%`}
                        contentStyle={{
                          backgroundColor: 'var(--card-bg)',
                          borderColor: 'var(--border-col)',
                          borderRadius: '0.75rem',
                          color: 'var(--fg)',
                          fontSize: '12px',
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
                  {sectorChartData.map((s, idx) => (
                    <div key={s.name} className="flex items-center justify-between text-xs gap-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                        <span className="truncate text-muted-foreground">{s.name}</span>
                      </div>
                      <span className="font-semibold text-foreground shrink-0">{s.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No sector data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scheme Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Tracked Mutual Fund Schemes</h4>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')}>
            <MessageSquareText className="w-3.5 h-3.5" />
            Open AI Chat
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allFunds.map((fund, idx) => {
            const isSelected = idx === selectedFundIndex;
            return (
              <Card
                key={fund.fund_name}
                onClick={() => onSelectFund(idx)}
                className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm ${
                  isSelected ? 'border-primary ring-1 ring-primary/30' : ''
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h5 className="text-sm font-semibold text-foreground truncate">{fund.fund_name}</h5>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fund.fund_category} • {fund.fund_sub_category}
                      </p>
                    </div>
                    <Badge variant={isSelected ? 'default' : 'secondary'} className="shrink-0">
                      {fund.nav}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-xs">
                    <div>
                      <span className="text-muted-foreground block">Expense</span>
                      <span className="font-semibold text-foreground">{fund.expense_ratio}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Min SIP</span>
                      <span className="font-semibold text-foreground">{fund.minimum_sip}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">3Y Return</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {fund.annualised_returns?.fund_return_3y || fund.historical_returns?.['3_years_return'] || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <ShieldAlert className="w-3 h-3" />
                      {fund.risk_level}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAskAI(`Tell me the key metrics and top holdings of ${fund.fund_name}`);
                      }}
                      className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      Ask AI
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
