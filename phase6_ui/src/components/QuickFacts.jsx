import { Percent, TrendingUp, PieChart, ArrowRight, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const DEFAULT_GROUPS = [
  { title: 'Expense Ratios & Fees', icon: Percent, categories: ['mid cap', 'small cap', 'flexi cap', 'multi cap'], metric: 'expense ratio' },
  { title: 'NAV & Performance', icon: TrendingUp, categories: ['large cap', 'flexi cap', 'mid cap', 'multi cap'], metric: 'current NAV and 3-year returns' },
  { title: 'Holdings & Allocation', icon: PieChart, categories: ['small cap', 'mid cap', 'flexi cap', 'multi cap'], metric: 'top holdings and sector allocation' },
];

function makeGroups(funds) {
  const preferredAmcs = ['ICICI Prudential', 'SBI', 'Axis', 'Bandhan'];
  return DEFAULT_GROUPS.map((group) => ({
    ...group,
    queries: group.categories
      .map((category, index) => {
        const categoryKey = category.replace(/\s+/g, '');
        const match = funds.find((fund) => {
          const name = fund.fund_name.toLowerCase().replace(/\s+/g, '');
          return name.includes(categoryKey) && fund.fund_name.startsWith(preferredAmcs[index]);
        });
        return match ? `What is the ${group.metric} for ${match.fund_name}?` : null;
      })
      .filter(Boolean),
  }));
}

export default function QuickFacts({ funds = [], onQuerySelect }) {
  const groups = makeGroups(funds);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-transparent">
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Quick Facts &amp; Prompt Templates
          </h3>
          <p className="text-sm text-muted-foreground">
            Start with a scheme from the indexed HDFC, ICICI Prudential, SBI, Axis, or Bandhan collection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {groups.map((group) => {
            const Icon = group.icon;
            return (
              <Card key={group.title}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{group.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {group.queries.map((query) => (
                    <button
                      key={query}
                      type="button"
                      onClick={() => onQuerySelect(query)}
                      className="group w-full text-left p-3 rounded-lg border border-border bg-background hover:bg-muted hover:border-primary/40 transition-all text-xs font-medium text-foreground flex items-start justify-between gap-2 cursor-pointer"
                    >
                      <span className="leading-relaxed">{query}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                    </button>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
