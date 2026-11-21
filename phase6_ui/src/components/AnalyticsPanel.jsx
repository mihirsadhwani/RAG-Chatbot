import { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  Gauge,
  ShieldCheck,
  ThumbsUp,
  RefreshCw,
  HelpCircle,
  BadgeCheck,
  Download,
  Award,
  Cpu,
  MousePointerClick,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { fetchAnalytics, fetchStatus, fetchEvalSummary, trackEvent } from '../services/api';

const OUTCOME_VARIANT = {
  answered: 'success',
  blocked: 'warning',
  no_info: 'secondary',
  error: 'warning',
  greeting: 'outline',
};

function Kpi({ label, value, hint, icon }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPanel() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(null);
  const [evalData, setEvalData] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    Promise.all([fetchAnalytics(), fetchStatus(), fetchEvalSummary().catch(() => null)])
      .then(([a, s, ev]) => {
        setData(a);
        setStatus(s);
        setEvalData(ev);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleExportCsv = () => {
    if (!data?.recent?.length) return;
    const rows = [
      ['Timestamp', 'Query', 'Outcome', 'Engine', 'EntryPoint', 'LatencyMs', 'Feedback'].join(','),
      ...data.recent.map((r) =>
        [
          `"${r.ts}"`,
          `"${String(r.query || '').replace(/"/g, '""')}"`,
          r.outcome,
          r.engine || '-',
          r.source_ui || '-',
          r.latency_ms ?? '',
          r.feedback === 1 ? 'Helpful' : r.feedback === -1 ? 'Not helpful' : '',
        ].join(',')
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rag_query_analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
    trackEvent('csv_export', 'analytics_panel');
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Could not load analytics. Is the backend running?
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Loading analytics...
      </div>
    );
  }

  const fb = data.positive_feedback_rate;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              AI Quality &amp; Product Analytics
            </h3>
            <p className="text-sm text-muted-foreground">
              Tracks query outcomes, latency, engine split, entry-point funnel, AMC demand, and golden eval accuracy.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!data.recent?.length}>
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Kpi
            label="Total Queries"
            value={data.total_queries}
            hint={`${data.feedback_count} rated by users`}
            icon={<Activity className="w-4 h-4 text-primary" />}
          />
          <Kpi
            label="Cited Answer Rate"
            value={`${data.cited_answer_rate}%`}
            hint="Answers backed by a source link"
            icon={<BadgeCheck className="w-4 h-4 text-primary" />}
          />
          <Kpi
            label="Helpful Rate"
            value={fb === null ? 'No ratings' : `${fb}%`}
            hint="Thumbs-up share of rated answers"
            icon={<ThumbsUp className="w-4 h-4 text-primary" />}
          />
          <Kpi
            label="Avg / P95 Latency"
            value={`${data.avg_latency_ms} ms`}
            hint={`P95: ${data.p95_latency_ms} ms`}
            icon={<Gauge className="w-4 h-4 text-primary" />}
          />
        </div>

        {/* Product Funnel, Engine Split & Golden Eval Scorecard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Golden Eval Scorecard
              </CardTitle>
              <CardDescription>Automated benchmark (`eval/run_eval.py`)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {evalData?.available ? (
                <>
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-muted-foreground">Overall Pass Rate</span>
                    <Badge variant="success">
                      {evalData.passed}/{evalData.total} ({evalData.pass_rate}%)
                    </Badge>
                  </div>
                  {Object.entries(evalData.summary).map(([cat, vals]) => (
                    <div key={cat} className="flex justify-between border-b border-border/60 pb-2 last:border-0">
                      <span className="text-muted-foreground capitalize">{cat}</span>
                      <span className="font-semibold">
                        {vals.passed}/{vals.total}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Run `python eval/run_eval.py` to generate scorecard.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                Engine &amp; AMC Demand
              </CardTitle>
              <CardDescription>Which model answered &amp; which AMCs users ask about</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <p className="font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Response Engine</p>
                {Object.keys(data.engines || {}).length === 0 ? (
                  <p className="text-muted-foreground">No queries yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(data.engines).map(([eng, cnt]) => (
                      <Badge key={eng} variant="outline">
                        {eng}: {cnt}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">AMC Demand</p>
                {(data.amc_demand || []).length === 0 ? (
                  <p className="text-muted-foreground">No AMC-specific queries yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {data.amc_demand.map((a) => (
                      <Badge key={a.amc} variant="secondary">
                        {a.amc}: {a.count}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-primary" />
                Entry Points &amp; Feature Events
              </CardTitle>
              <CardDescription>How users discover and interact with tools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <p className="font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Query Entry Points</p>
                {Object.keys(data.entry_points || {}).length === 0 ? (
                  <p className="text-muted-foreground">No queries yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(data.entry_points).map(([ep, cnt]) => (
                      <Badge key={ep} variant="outline">
                        {ep}: {cnt}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Feature Interactions</p>
                {Object.keys(data.events || {}).length === 0 ? (
                  <p className="text-muted-foreground">No tool events tracked yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(data.events).map(([ev, cnt]) => (
                      <Badge key={ev} variant="secondary">
                        {ev}: {cnt}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Safety, Unanswered & Freshness */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Safety &amp; Coverage
              </CardTitle>
              <CardDescription>Outcome breakdown across all queries</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {[
                ['Guardrail blocked', `${data.blocked_rate}%`],
                ['Not in knowledge base', `${data.no_info_rate}%`],
                ['System errors', `${data.error_rate}%`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border/60 pb-2 last:border-0">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-semibold">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" />
                Unanswered Questions
              </CardTitle>
              <CardDescription>Product backlog: gaps in the knowledge base</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.unanswered.length === 0 && (
                <p className="text-sm text-muted-foreground">No gaps recorded yet.</p>
              )}
              {data.unanswered.map((u, i) => (
                <div key={i} className="text-xs p-2.5 rounded-lg bg-muted/60 border border-border">
                  {u.query}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Freshness</CardTitle>
              <CardDescription>Knowledge base health</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {status &&
                [
                  ['Funds indexed', status.funds_indexed],
                  ['Latest NAV date', status.latest_nav_date || 'n/a'],
                  ['Last data sync', status.last_data_sync ? new Date(status.last_data_sync).toLocaleString() : 'n/a'],
                  ['Generator chain', status.generator_model],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
                    <span className="text-muted-foreground shrink-0">{k}</span>
                    <span className="font-semibold text-right truncate">{v}</span>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Queries Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Queries</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Query</th>
                  <th className="py-2 pr-3 font-medium">Outcome</th>
                  <th className="py-2 pr-3 font-medium">Engine</th>
                  <th className="py-2 pr-3 font-medium">Entry</th>
                  <th className="py-2 pr-3 font-medium">Latency</th>
                  <th className="py-2 font-medium">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r, i) => (
                  <tr key={i} className="border-b border-border/40 last:border-0">
                    <td className="py-2 pr-3 max-w-[360px] truncate">{r.query}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={OUTCOME_VARIANT[r.outcome] || 'outline'}>{r.outcome}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.engine || '-'}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.source_ui || '-'}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.latency_ms} ms</td>
                    <td className="py-2 text-muted-foreground">
                      {r.feedback === 1 ? 'Helpful' : r.feedback === -1 ? 'Not helpful' : '-'}
                    </td>
                  </tr>
                ))}
                {data.recent.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-muted-foreground">
                      Ask a question in the chat to generate data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
