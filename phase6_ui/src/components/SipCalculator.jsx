import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const inr = (n) => `Rs ${Math.round(n).toLocaleString('en-IN')}`;
const short = (n = '') => n.replace('HDFC ', '').replace(' Fund Direct Growth', '').replace(' Direct Plan Growth', '');

export default function SipCalculator({ funds = [] }) {
  const [fundIdx, setFundIdx] = useState('0');
  const [monthly, setMonthly] = useState(5000);
  const [years, setYears] = useState(10);

  const fund = funds[Number(fundIdx)];
  const annualReturn = num(fund?.annualised_returns?.fund_return_5y || fund?.annualised_returns?.fund_return_3y);
  const expense = num(fund?.expense_ratio);

  const result = useMemo(() => {
    const m = Number(monthly) || 0;
    const y = Number(years) || 0;
    // Reported fund returns are already net of the expense ratio.
    const netMonthly = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
    const grossMonthly = Math.pow(1 + (annualReturn + expense) / 100, 1 / 12) - 1;
    const series = [];
    let net = 0, gross = 0;
    for (let mo = 1; mo <= y * 12; mo++) {
      net = (net + m) * (1 + netMonthly);
      gross = (gross + m) * (1 + grossMonthly);
      if (mo % 12 === 0) series.push({ year: `Y${mo / 12}`, invested: m * mo, value: Math.round(net) });
    }
    return { invested: m * y * 12, value: net, feeDrag: gross - net, series };
  }, [monthly, years, annualReturn, expense]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-transparent">
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            SIP &amp; Expense Ratio Calculator
          </h3>
          <p className="text-sm text-muted-foreground">
            Illustrates how a monthly SIP could grow if the fund repeated its past annualised return, and how much the expense ratio costs.
          </p>
        </div>

        <Card>
          <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Scheme</label>
              <Select value={fundIdx} onValueChange={setFundIdx}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {funds.map((f, i) => <SelectItem key={f.fund_name} value={String(i)}>{short(f.fund_name)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Monthly SIP (Rs)</label>
              <Input type="number" min={100} value={monthly} onChange={(e) => setMonthly(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Duration (years)</label>
              <Input type="number" min={1} max={30} value={years} onChange={(e) => setYears(Math.min(30, e.target.value))} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            ['Total Invested', inr(result.invested)],
            [`Illustrative Value (${annualReturn}% p.a.)`, inr(result.value)],
            [`Fee Drag (${expense}% expense ratio)`, inr(result.feeDrag)],
          ].map(([k, v]) => (
            <Card key={k}>
              <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k}</CardTitle></CardHeader>
              <CardContent><div className="text-xl font-bold">{v}</div></CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projected Growth</CardTitle>
            <CardDescription>Based on the scheme's reported 5-year annualised return (3-year if unavailable)</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.series} margin={{ left: -8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-col)" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-fg)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 100000)}L`} />
                <Tooltip formatter={(v) => inr(v)} contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-col)', borderRadius: '0.75rem', fontSize: 12 }} />
                <Area type="monotone" dataKey="invested" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.12} name="Invested" />
                <Area type="monotone" dataKey="value" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.18} name="Value" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Illustration only. Past returns do not guarantee future results, and this is not investment advice.
          Reported returns are assumed to be net of the expense ratio; fee drag estimates what the ratio removed.
        </p>
      </div>
    </div>
  );
}
