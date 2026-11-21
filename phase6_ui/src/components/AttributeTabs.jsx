import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card } from './ui/card';

export default function AttributeTabs({ fundData }) {
  if (!fundData) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Select a scheme to inspect its detailed attributes.
      </Card>
    );
  }

  return (
    <Card className="p-3 overflow-hidden">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="sectors">Sectors</TabsTrigger>
          <TabsTrigger value="investment">Investment</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab data={fundData} />
        </TabsContent>
        <TabsContent value="returns">
          <ReturnsTab data={fundData} />
        </TabsContent>
        <TabsContent value="holdings">
          <HoldingsTab data={fundData} />
        </TabsContent>
        <TabsContent value="sectors">
          <SectorsTab data={fundData} />
        </TabsContent>
        <TabsContent value="investment">
          <InvestmentTab data={fundData} />
        </TabsContent>
        <TabsContent value="tax">
          <TaxTab data={fundData} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-3 py-2 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-semibold text-foreground text-right">{value || 'N/A'}</span>
    </div>
  );
}

function OverviewTab({ data }) {
  return (
    <div className="space-y-0.5">
      <InfoRow label="NAV" value={data.nav} />
      <InfoRow label="NAV Date" value={data.nav_date} />
      <InfoRow label="Expense Ratio" value={data.expense_ratio} />
      <InfoRow label="Minimum SIP" value={data.minimum_sip} />
      <InfoRow label="Fund Size (AUM)" value={data.fund_size_aum} />
      <InfoRow label="Risk Level" value={data.risk_level} />
      <InfoRow label="Category" value={data.fund_category} />
      <InfoRow label="Sub-Category" value={data.fund_sub_category} />
    </div>
  );
}

function ReturnsTab({ data }) {
  const hist = data.historical_returns || {};
  const annualised = data.annualised_returns || {};
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Historical Returns
        </p>
        <div className="space-y-0.5">
          <InfoRow label="1 Year" value={hist['1_year_return']} />
          <InfoRow label="3 Years" value={hist['3_years_return']} />
          <InfoRow label="5 Years" value={hist['5_years_return']} />
          <InfoRow label="10 Years" value={hist['10_years_return']} />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Annualised Returns
        </p>
        <div className="space-y-0.5">
          {Object.entries(annualised).length > 0 ? (
            Object.entries(annualised).map(([k, v]) => (
              <InfoRow key={k} label={k.replace(/_/g, ' ')} value={v} />
            ))
          ) : (
            <p className="text-xs text-muted-foreground py-2">No annualised return data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HoldingsTab({ data }) {
  const holdings = data.holdings || [];
  if (holdings.length === 0) {
    return <p className="text-xs text-muted-foreground py-4">No holdings data available.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="py-2 pr-2 font-medium">Company</th>
            <th className="py-2 pr-2 font-medium">Sector</th>
            <th className="py-2 text-right font-medium">Weight</th>
          </tr>
        </thead>
        <tbody>
          {holdings.slice(0, 12).map((h, i) => (
            <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/50">
              <td className="py-2 pr-2 font-medium text-foreground">{h.company_name}</td>
              <td className="py-2 pr-2 text-muted-foreground">{h.sector || '-'}</td>
              <td className="py-2 text-right font-semibold text-primary">{h.allocation_percentage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectorsTab({ data }) {
  const sectors = data.equity_sector_allocation || {};
  const entries = Object.entries(sectors);
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground py-4">No sector data available.</p>;
  }
  return (
    <div className="space-y-2.5">
      {entries.map(([name, pct]) => {
        const numPct = parseFloat(pct) || 0;
        return (
          <div key={name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-foreground font-medium">{name}</span>
              <span className="font-semibold text-primary">{pct}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(numPct, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InvestmentTab({ data }) {
  const exit = data.exit_load_details || {};
  const req = data.investment_requirements || {};
  return (
    <div className="space-y-0.5">
      <InfoRow label="Minimum SIP" value={data.minimum_sip} />
      <InfoRow label="Minimum Lumpsum" value={req.minimum_lumpsum || data.minimum_lumpsum} />
      <InfoRow label="Exit Load" value={exit.exit_load} />
      <InfoRow label="Stamp Duty" value={exit.stamp_duty} />
    </div>
  );
}

function TaxTab({ data }) {
  const exit = data.exit_load_details || {};
  return (
    <div className="space-y-0.5">
      <InfoRow label="Tax Implication" value={exit.tax_implication} />
      <InfoRow label="Stamp Duty" value={exit.stamp_duty} />
    </div>
  );
}
