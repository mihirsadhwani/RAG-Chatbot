import { PanelRightClose, PanelRightOpen, Layers, ExternalLink, Sparkles } from 'lucide-react';
import AttributeTabs from './AttributeTabs';
import SourceCard from './SourceCard';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export default function FundInfoPanel({
  lastResult,
  allFunds = [],
  selectedFundIndex = 0,
  setSelectedFundIndex,
  isCollapsed,
  onToggle,
}) {
  const currentFund = allFunds?.[selectedFundIndex] || null;

  if (isCollapsed) {
    return (
      <div className="h-full w-full flex flex-col items-center py-4 bg-transparent">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          title="Expand Fund Explorer"
          aria-label="Expand Fund Explorer"
        >
          <PanelRightOpen className="w-4 h-4" />
        </Button>
        <div
          onClick={onToggle}
          className="mt-6 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          style={{ writingMode: 'vertical-rl' }}
        >
          Fund Explorer
        </div>
      </div>
    );
  }

  const infoCards = currentFund
    ? [
        { label: 'NAV', value: currentFund.nav },
        { label: 'Expense Ratio', value: currentFund.expense_ratio },
        { label: 'Min SIP', value: currentFund.minimum_sip },
        { label: 'AUM', value: currentFund.fund_size_aum },
      ]
    : [];

  return (
    <div className="flex flex-col h-full bg-transparent w-full">
      {/* Header */}
      <div className="h-16 px-4 border-b border-border flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">Fund Explorer</h2>
            <p className="text-[11px] text-muted-foreground truncate">Structured KB Inspector</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          title="Collapse Fund Explorer"
          aria-label="Collapse Fund Explorer"
        >
          <PanelRightClose className="w-4 h-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {allFunds.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Selected Scheme
            </label>
            <Select
              value={String(selectedFundIndex)}
              onValueChange={(val) => setSelectedFundIndex(Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a fund" />
              </SelectTrigger>
              <SelectContent>
                {allFunds.map((f, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {f.fund_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {currentFund && (
          <>
            <div className="flex items-center justify-between gap-2">
              <Badge variant="info">{currentFund.fund_category}</Badge>
              {currentFund.source_url && (
                <a
                  href={currentFund.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Groww
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {infoCards.map((c) => (
              <Card key={c.label} className="p-3 bg-white/45 dark:bg-white/5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    {c.label}
                  </span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block truncate">
                    {c.value || 'N/A'}
                  </span>
                </Card>
              ))}
            </div>

            <AttributeTabs fundData={currentFund} />
          </>
        )}

        {lastResult?.sources && lastResult.sources.length > 0 && (
          <Card className="p-3.5 bg-primary/5 border-primary/20 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Last AI Response Sources</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {lastResult.sources.map((url, idx) => (
                <SourceCard key={idx} url={url} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
