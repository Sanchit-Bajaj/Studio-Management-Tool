"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useUpdateProspect } from "@/hooks/useProspects";
import { suggestMarginFromSignals } from "@/lib/calc";
import { URGENCY, COMPETITIVE, CLIENT_SIZE } from "@/lib/constants";
import { fmtPct } from "@/lib/utils";

export function ValueSignalsCard({ prospect }) {
  const [s, setS] = useState(() => initial(prospect));
  const update = useUpdateProspect();

  useEffect(() => { setS(initial(prospect)); }, [prospect.id]);

  const set = (k) => (v) => setS((prev) => ({ ...prev, [k]: v }));
  const suggested = suggestMarginFromSignals(s);

  const onSave = () => {
    update.mutate({
      id: prospect.id,
      vsMode: s.vsMode,
      vsComplexity: Number(s.vsComplexity),
      vsImpact: Number(s.vsImpact),
      vsUrgency: s.vsUrgency,
      vsCompetitive: s.vsCompetitive,
      vsClientSize: s.vsClientSize,
      vsRevenueImpact: s.vsRevenueImpact ? String(s.vsRevenueImpact) : null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Value-based pricing</CardTitle>
        <p className="text-sm text-muted">Signals here suggest a margin to apply on the estimate.</p>
      </CardHeader>
      <CardContent>
        <Tabs value={s.vsMode} onValueChange={set("vsMode")}>
          <TabsList>
            <TabsTrigger value="MATRIX">Signal matrix</TabsTrigger>
            <TabsTrigger value="REVENUE">Revenue impact</TabsTrigger>
          </TabsList>

          <TabsContent value="MATRIX" className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Complexity">
                <Select value={String(s.vsComplexity)} onValueChange={set("vsComplexity")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Simple</SelectItem>
                    <SelectItem value="2">Standard</SelectItem>
                    <SelectItem value="3">Complex</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Impact">
                <Select value={String(s.vsImpact)} onValueChange={set("vsImpact")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Tactical</SelectItem>
                    <SelectItem value="2">Important</SelectItem>
                    <SelectItem value="3">Transformative</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Urgency">
                <Select value={s.vsUrgency} onValueChange={set("vsUrgency")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {URGENCY.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Competitive position">
                <Select value={s.vsCompetitive} onValueChange={set("vsCompetitive")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPETITIVE.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Client size">
                <Select value={s.vsClientSize} onValueChange={set("vsClientSize")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLIENT_SIZE.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </TabsContent>

          <TabsContent value="REVENUE" className="space-y-4">
            <Field label="Projected year-1 revenue impact for client (₹)">
              <Input
                type="number" min={0}
                value={s.vsRevenueImpact ?? ""}
                onChange={(e) => set("vsRevenueImpact")(e.target.value)}
                placeholder="e.g. 50000000"
              />
            </Field>
            <p className="text-xs text-muted">
              Pricing tier: ≥ ₹10 cr → 60% · ≥ ₹1 cr → 50% · ≥ ₹10 lakh → 40%.
            </p>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between rounded-md bg-sand/60 border border-border p-3 mt-5">
          <div>
            <p className="text-xs text-muted">Suggested margin</p>
            <p className="text-2xl font-semibold text-ink">{suggested != null ? fmtPct(suggested) : "—"}</p>
          </div>
          <Button onClick={onSave} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save signals"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function initial(p) {
  return {
    vsMode: p.vsMode || "MATRIX",
    vsComplexity: p.vsComplexity ?? 2,
    vsImpact: p.vsImpact ?? 2,
    vsUrgency: p.vsUrgency || "STANDARD",
    vsCompetitive: p.vsCompetitive || "SHORTLISTED",
    vsClientSize: p.vsClientSize || "FUNDED",
    vsRevenueImpact: p.vsRevenueImpact ?? "",
  };
}
