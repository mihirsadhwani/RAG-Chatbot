import { useMemo, useState } from 'react';
import { GitCompare, Info, Layers, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { trackEvent } from '../services/api';

const short = (n = '') =>
  n.replace(' Direct Plan Growth', '').replace(' Direct Growth', '');

const parsePct = (v) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const normCompany = (s = '') =>
  s
    .toLowerCase()
    .replace(/\b(ltd|limited|india|the|of|and|corp|corporation)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const ROWS = [
  ['NAV', (f) => f.nav],
  ['NAV Date', (f) => f.nav_date],
  ['Expense Ratio', (f) => f.expense_ratio],
  ['Minimum SIP', (f) => f.minimum_sip],
  ['Fund Size (AUM)', (f) => f.fund_size_aum],
  ['Risk Level', (f) => f.risk_level],
  ['Category', (f) => f.fund_sub_category || f.fund_category],
  ['3Y Annualised Return', (f) => f.annualised_returns?.fund_return_3y],
  ['5Y Annualised Return', (f) => f.annualised_returns?.fund_return_5y],
  ['10Y Annualised Return', (f) => f.annualised_returns?.fund_return_10y],
  ['Exit Load', (f) => f.exit_load_details?.exit_load],
  ['Holdings Count', (f) => String((f.holdings || []).length)],
  [
    'Top Holding',
    (f) =>
      f.holdings?.[0]
        ? `${f.holdings[0].company_name} (${f.holdings[0].allocation_percentage})`
        : null,
  ],
];

export default function ComparePanel({ funds = [] }) {
  const [picks, setPicks] = useState(['0', '1', '2']);

  const selected = useMemo(
    () => picks.map((p) => funds[Number(p)]).filter(Boolean),
    [picks, funds]
  );

  // Portfolio Stock Overlap Calculation across selected schemes
  const overlap = useMemo(() => {
    if (selected.length < 2) {
      return { shared: [], avgOverlapPct: 0, totalUnique: 0 };
    }
    const companyMap = new Map();
    selected.forEach((fund, idx) => {
      (fund.holdings || []).forEach((h) => {
        const key = normCompany(h.company_name);
        if (!key) return;
        if (!companyMap.has(key)) {
          companyMap.set(key, {
            name: h.company_name,
            sector: h.sector || '-',
            weights: Array(selected.length).fill(0),
          });
        }
        const entry = companyMap.get(key);
        entry.weights[idx] += parsePct(h.allocation_percentage);
      });
    });

    const shared = [];
    for (const entry of companyMap.values()) {
      const heldIn = entry.weights.filter((w) => w > 0).length;
      if (heldIn >= 2) {
        const minWeight = Math.min(...entry.weights.filter((w) => w > 0));
        shared.push({ ...entry, heldIn, minWeight });
      }
    }
    shared.sort((a, b) => b.heldIn - a.heldIn || b.minWeight - a.minWeight);

    // Pairwise overlap between first 2 schemes (sum of min weights of shared stocks)
    let pairOverlap = 0;
    for (const entry of companyMap.values()) {
      if (entry.weights[0] > 0 && entry.weights[1] > 0) {
        pairOverlap += Math.min(entry.weights[0], entry.weights[1]);
      }
    }

    return {
      shared,
      pairOverlapPct: pairOverlap.toFixed(1),
      totalUnique: companyMap.size,
    };
  }, [selected]);

  const handleExportCsv = () => {
    if (!selected.length) return;
    const headers = ['Metric', ...selected.map((f) => `"${f.fund_name}"`)];
    const lines = [headers.join(',')];
    for (const [label, get] of ROWS) {
      const vals = selected.map((f) => `"${String(get(f) || '-').replace(/"/g, '""')}"`);
      lines.push([`"${label}"`, ...vals].join(','));
    }
    if (overlap.shared.length) {
      lines.push('');
      lines.push(`"Shared Holdings (${selected[0]?.fund_name} vs ${selected[1]?.fund_name} overlap: ${overlap.pairOverlapPct}%)"`);
      lines.push(['Company', 'Sector', ...selected.map((f) => `"${short(f.fund_name)} %"` )].join(','));
      overlap.shared.slice(0, 25).forEach((s) => {
        lines.push([`"${s.name}"`, `"${s.sector}"`, ...s.weights.map((w) => w.toFixed(2))].join(','));
      });
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mutual_fund_comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
    trackEvent('csv_export', 'compare_panel');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-primary" />
              Compare Schemes &amp; Portfolio Overlap
            </h3>
            <p className="text-sm text-muted-foreground">
              Factual side-by-side metrics and stock overlap analysis across any {funds.length} indexed schemes.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!selected.length}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {picks.map((val, slot) => (
            <Select
              key={slot}
              value={val}
              onValueChange={(v) => {
                setPicks((p) => p.map((x, i) => (i === slot ? v : x)));
                trackEvent('compare_select', funds[Number(v)]?.fund_name || v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select fund" />
              </SelectTrigger>
              <SelectContent>
                {funds.map((f, i) => (
                  <SelectItem key={f.fund_name} value={String(i)}>
                    {short(f.fund_name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>

        <Tabs defaultValue="metrics" onValueChange={(v) => v === 'overlap' && trackEvent('overlap_check')}>
          <TabsList>
            <TabsTrigger value="metrics">Metric Comparison</TabsTrigger>
            <TabsTrigger value="overlap">
              Portfolio Overlap ({overlap.shared.length} shared)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metrics">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Metric Comparison</CardTitle>
                <CardDescription>Source: Groww scheme pages, as stored in the knowledge base</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">Metric</th>
                      {selected.map((f, i) => (
                        <th key={i} className="py-2 pr-4 font-semibold">
                          {short(f.fund_name)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map(([label, get]) => (
                      <tr key={label} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-4 text-muted-foreground text-xs">{label}</td>
                        {selected.map((f, i) => (
                          <td key={i} className="py-2.5 pr-4">
                            {get(f) || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overlap" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Pairwise Weight Overlap (1 vs 2)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{overlap.pairOverlapPct}%</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sum of minimum weights across shared holdings
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Shared Companies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overlap.shared.length}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Held by 2 or more selected schemes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Combined Unique Stocks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overlap.totalUnique}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Distinct companies across selected funds
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Top Overlapping Holdings
                </CardTitle>
                <CardDescription>
                  Helps spot concentration &amp; false diversification before investing in multiple funds
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Company</th>
                      <th className="py-2 pr-3 font-medium">Sector</th>
                      <th className="py-2 pr-3 font-medium">Held In</th>
                      {selected.map((f, i) => (
                        <th key={i} className="py-2 pr-3 text-right font-medium">
                          {short(f.fund_name)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overlap.shared.slice(0, 20).map((s) => (
                      <tr key={s.name} className="border-b border-border/40 last:border-0">
                        <td className="py-2 pr-3 font-medium text-foreground">{s.name}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{s.sector}</td>
                        <td className="py-2 pr-3">
                          <Badge variant={s.heldIn === selected.length ? 'warning' : 'secondary'}>
                            {s.heldIn}/{selected.length} funds
                          </Badge>
                        </td>
                        {s.weights.map((w, i) => (
                          <td key={i} className="py-2 pr-3 text-right font-semibold">
                            {w > 0 ? `${w.toFixed(2)}%` : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {overlap.shared.length === 0 && (
                      <tr>
                        <td colSpan={3 + selected.length} className="py-4 text-center text-muted-foreground">
                          No overlapping holdings found across the selected funds.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <Badge variant="outline" className="mr-1.5">Why no winner?</Badge>
            Picking a &quot;best&quot; fund depends on goals and risk appetite, which is advice this tool deliberately does not give.
          </span>
        </div>
      </div>
    </div>
  );
}
