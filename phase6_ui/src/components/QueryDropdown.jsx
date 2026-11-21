import { useState } from 'react';
import { SlidersHorizontal, ArrowRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';

const ATTRIBUTES = [
  { id: 'nav', label: 'Current NAV' },
  { id: 'expense_ratio', label: 'Expense Ratio' },
  { id: 'minimum_sip', label: 'Minimum SIP' },
  { id: 'fund_size_aum', label: 'Fund Size / AUM' },
  { id: 'exit_load', label: 'Exit Load' },
  { id: 'returns', label: 'Returns (1Y, 3Y, 5Y)' },
  { id: 'holdings', label: 'Top Holdings' },
  { id: 'sector_allocation', label: 'Sector Allocation' },
  { id: 'fund_managers', label: 'Fund Manager' },
  { id: 'risk_level', label: 'Risk Level' },
];

export default function QueryDropdown({ allFunds = [], funds = [], onQueryGenerated }) {
  const fundList = allFunds.length ? allFunds : funds;
  const [selectedAttribute, setSelectedAttribute] = useState('');
  const [selectedFund, setSelectedFund] = useState('');

  const handleAsk = () => {
    if (!selectedAttribute || !selectedFund) return;
    const attrLabel = ATTRIBUTES.find((a) => a.id === selectedAttribute)?.label || selectedAttribute;
    onQueryGenerated(`What is the ${attrLabel} of ${selectedFund}?`);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
        <span>Quick Fact Builder</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 min-w-0">
          <Select value={selectedAttribute} onValueChange={setSelectedAttribute}>
            <SelectTrigger>
              <SelectValue placeholder="Choose attribute..." />
            </SelectTrigger>
            <SelectContent>
              {ATTRIBUTES.map((attr) => (
                <SelectItem key={attr.id} value={attr.id}>
                  {attr.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-0">
          <Select value={selectedFund} onValueChange={setSelectedFund}>
            <SelectTrigger>
              <SelectValue placeholder="Choose fund..." />
            </SelectTrigger>
            <SelectContent>
              {fundList.map((fund) => (
                <SelectItem key={fund.fund_name} value={fund.fund_name}>
                  {fund.fund_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleAsk}
          disabled={!selectedAttribute || !selectedFund}
          className="shrink-0"
        >
          Ask
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
