import { CheckCircle2, Ban, BookOpen, Cpu } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

const SUPPORTED = [
  '26 Direct Growth schemes across 5 AMCs (HDFC, ICICI Prudential, SBI, Axis, Bandhan)',
  'Structured NAV, AUM, expense ratios, and minimum SIP/lumpsum requirements',
  'Historical & annualised returns (1Y, 3Y, 5Y, 10Y) vs category benchmarks',
  'Holdings lookup across all funds, equity/debt sector allocations, and cash splits',
  'Side-by-side Scheme Comparison, Portfolio Stock Overlap, and SIP Calculator',
  'Exit loads, stamp duty, tax implications, and fund managers',
];

const BLOCKED = [
  'Direct investment advice ("Should I invest?" or "Recommend a fund")',
  'Subjective buy/sell verdicts ("Which fund is best for me?")',
  'Unsupported AMCs outside the 5 indexed fund houses (e.g., Nippon, Parag Parikh)',
  'Live intraday stock trading prices',
];

export default function Documentation() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            System Documentation &amp; Guardrails
          </h3>
          <p className="text-sm text-muted-foreground">
            Overview of the Multi-AMC Mutual Fund RAG architecture, supported tools, and compliance boundaries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Supported Coverage &amp; Tools</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {SUPPORTED.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Ban className="w-4 h-4 text-amber-500" />
                <span>Guardrails &amp; Blocked Topics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {BLOCKED.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              <span>Hybrid RAG &amp; Analytics Pipeline</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Queries pass through compliance guardrails, dynamic AMC/category detection, and cross-fund holding search over <code className="text-xs bg-muted px-1.5 py-0.5 rounded">raw_funds.json</code> (26 schemes). Answers are synthesized with <Badge variant="outline">gemini-3-flash-preview</Badge> / <Badge variant="outline">gemini-flash-lite-latest</Badge> with automatic deterministic KB fallback on rate limits, and logged to SQLite for latency, outcome, and feedback analytics.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
