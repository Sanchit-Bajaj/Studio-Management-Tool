"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { fmt, fmtPct } from "@/lib/utils";
import { calcPartnerSplit } from "@/lib/calc";

// Receives pre-computed `calc` from the API (so tax/commission stay in sync)
// plus studio + team for partner split rendering.
export function ProfitCalculator({ estimate, calc, studio, team }) {
  if (!calc) return null;

  const revenue = estimate.contractValue ? Number(estimate.contractValue) : calc.revenue;
  const usingContract = estimate.contractValue != null;

  // Recompute partner split client-side using net profit + partners.
  const partners = (team || []).filter((m) => m.isPartner).map((m) => ({
    id: m.id, name: m.name, equityPct: m.equityPct,
    execPremPct: m.execPremPct, bdevPremPct: m.bdevPremPct,
    isExecLead: m.id === estimate.executionLeadId,
  }));
  const splits = calcPartnerSplit(calc.netProfit, partners);
  const totalPayout = splits.reduce((s, x) => s + x.total, 0);
  const retained = calc.netProfit - totalPayout;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profit & loss</CardTitle>
          <p className="text-sm text-muted">
            Live numbers — tax modelled on entity = <span className="font-medium text-ink">{studio?.entity}</span>
            {studio?.gstRegistered && " · GST 18% on top of revenue"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row label="Revenue" value={revenue} bold sub={usingContract ? "From signed contract" : `Calculated quote at ${estimate.margin || 0}% margin`} />
          {studio?.gstRegistered && <Row label="+ GST (18%)" value={revenue * 0.18} muted />}
          <Separator />
          <Row label="− Commission" value={-calc.commissionCost} muted />
          <Row label="− Team cost" value={-calc.teamCost} muted />
          <Row label="− Software cost" value={-calc.softwareCost} muted />
          <Row label="− Overhead cost" value={-calc.overheadCost} muted />
          <Separator />
          <Row label="Gross profit" value={calc.grossProfit} bold sub={`${fmtPct(calc.grossMarginPct)} of revenue`} highlight={calc.grossProfit > 0 ? "good" : "bad"} />
          <Separator />
          <Row label={`− Tax (${fmtPct(calc.tax.effectiveRate)} effective)`} value={-calc.tax.total} muted
            sub={taxBreakdownText(calc.tax)} />
          <Separator />
          <Row label="Net profit" value={calc.netProfit} bold sub={`${fmtPct(calc.netMarginPct)} of revenue`} highlight={calc.netProfit > 0 ? "good" : "bad"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Partner distribution</CardTitle>
          <p className="text-sm text-muted">Splits net profit across partners using equity + premiums.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {partners.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">No partners configured. Mark members as partners on the Team page.</p>
          ) : (
            <>
              {splits.map((s) => {
                const pct = totalPayout > 0 ? (s.total / totalPayout) * 100 : 0;
                const partner = partners.find((p) => p.id === s.partnerId);
                return (
                  <div key={s.partnerId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{s.name}</span>
                        {partner?.isExecLead && <Badge variant="accent">Exec lead</Badge>}
                      </div>
                      <span className="font-medium text-ink">{fmt(s.total)}</span>
                    </div>
                    <Progress value={pct} />
                    <p className="text-xs text-muted">
                      Equity {fmt(s.equityShare)}
                      {s.execBonus > 0 && ` · Exec premium ${fmt(s.execBonus)}`}
                      {s.bdevBonus > 0 && ` · BDev premium ${fmt(s.bdevBonus)}`}
                    </p>
                  </div>
                );
              })}
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted">Retained in studio</span>
                <span className="font-medium text-ink">{fmt(Math.max(0, retained))}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, sub, bold, muted, highlight }) {
  const color = highlight === "good" ? "text-green" : highlight === "bad" ? "text-red-600" : "text-ink";
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={`text-sm ${muted ? "text-muted" : "text-ink"} ${bold ? "font-medium" : ""}`}>{label}</p>
        {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
      </div>
      <p className={`text-sm whitespace-nowrap ${bold ? `font-semibold ${color}` : muted ? "text-muted" : "text-ink"}`}>
        {fmt(value)}
      </p>
    </div>
  );
}

function taxBreakdownText(t) {
  if (t.total === 0) return "No tax — gross profit ≤ 0";
  const parts = [`Base ${fmt(t.base)}`];
  if (t.surcharge > 0) parts.push(`Surcharge ${fmt(t.surcharge)}`);
  parts.push(`Cess ${fmt(t.cess)}`);
  return parts.join(" · ");
}
