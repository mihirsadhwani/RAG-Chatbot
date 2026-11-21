import { useState, useMemo } from 'react';
import { Check, Search, ShieldAlert, ArrowUpRight, PieChart } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

function getAmc(name = '') {
  const n = name.toUpperCase();
  if (n.startsWith('HDFC')) return 'HDFC';
  if (n.startsWith('ICICI')) return 'ICICI';
  if (n.startsWith('SBI')) return 'SBI';
  if (n.startsWith('AXIS')) return 'Axis';
  if (n.startsWith('BANDHAN') || n.startsWith('IDFC')) return 'Bandhan';
  return 'Other';
}

export default function MutualFundsList({ funds = [], selectedIndex, onSelectFund, onAskAI }) {
  const [search, setSearch] = useState('');
  const [amcFilter, setAmcFilter] = useState('All');

  const amcs = useMemo(() => {
    const present = new Set(funds.map((f) => getAmc(f.fund_name)));
    return ['All', ...['HDFC', 'ICICI', 'SBI', 'Axis', 'Bandhan'].filter((a) => present.has(a))];
  }, [funds]);

  const filtered = funds.filter((f) => {
    if (amcFilter !== 'All' && getAmc(f.fund_name) !== amcFilter) return false;
    const q = search.toLowerCase();
    return (
      f.fund_name?.toLowerCase().includes(q) ||
      f.fund_category?.toLowerCase().includes(q) ||
      f.fund_sub_category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary" />
              Mutual Funds Knowledge Base ({funds.length})
            </h3>
            <p className="text-sm text-muted-foreground">
              Click any scheme to inspect it in Fund Explorer or query it with AI.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter schemes..."
              className="pl-9"
            />
          </div>
        </div>

        {amcs.length > 2 && (
          <div className="flex flex-wrap gap-1.5">
            {amcs.map((amc) => (
              <button
                key={amc}
                type="button"
                onClick={() => setAmcFilter(amc)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer',
                  amcFilter === amc
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground'
                )}
              >
                {amc}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((fund) => {
            const origIdx = funds.indexOf(fund);
            const isSelected = origIdx === selectedIndex;

            return (
              <Card
                key={fund.fund_name}
                onClick={() => onSelectFund(origIdx)}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm',
                  isSelected && 'border-primary ring-1 ring-primary/30'
                )}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-foreground">{fund.fund_name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fund.fund_category} • {fund.fund_sub_category}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border text-xs">
                    <div>
                      <span className="text-muted-foreground block">NAV</span>
                      <span className="font-semibold text-foreground">{fund.nav}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Expense</span>
                      <span className="font-semibold text-foreground">{fund.expense_ratio}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Min SIP</span>
                      <span className="font-semibold text-foreground">{fund.minimum_sip}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">AUM</span>
                      <span className="font-semibold text-foreground">{fund.fund_size_aum}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Badge variant="outline" className="text-[11px]">
                      <ShieldAlert className="w-3 h-3" />
                      {fund.risk_level}
                    </Badge>
                    {onAskAI && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAskAI(`What are the NAV, expense ratio, and 3-year returns of ${fund.fund_name}?`);
                        }}
                      >
                        Ask AI
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    )}
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
