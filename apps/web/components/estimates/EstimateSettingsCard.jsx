"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateEstimate } from "@/hooks/useEstimates";
import { ESTIMATE_TYPES, COMMISSION_TYPES } from "@/lib/constants";

export function EstimateSettingsCard({ estimate, team, locked }) {
  const [form, setForm] = useState(() => initial(estimate));
  const update = useUpdateEstimate();
  useEffect(() => { setForm(initial(estimate)); }, [estimate.id]);

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const onSave = () => {
    update.mutate({
      id: estimate.id,
      name: form.name,
      type: form.type,
      durationWeeks: Number(form.durationWeeks) || null,
      margin: form.type === "FIXED" ? Number(form.margin) || 0 : null,
      commissionType: form.commissionType,
      commissionCustomPct: form.commissionType === "CUSTOM" ? Number(form.commissionCustomPct) || 0 : null,
      contractValue: form.contractValue ? String(form.contractValue) : null,
      executionLeadId: form.executionLeadId || null,
    });
  };

  return (
    <Card>
      <CardHeader><CardTitle>Estimate settings</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => set("name")(e.target.value)} disabled={locked} />
        </Field>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={form.type} onValueChange={set("type")} disabled={locked}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESTIMATE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={form.type === "RETAINER" ? "Length (weeks, optional)" : "Duration (weeks)"}>
            <Input type="number" min={1} value={form.durationWeeks ?? ""} onChange={(e) => set("durationWeeks")(e.target.value)} disabled={locked} />
          </Field>
        </div>

        {form.type === "FIXED" && (
          <Field label="Collective margin %">
            <Input type="number" min={0} max={99} value={form.margin ?? ""} onChange={(e) => set("margin")(e.target.value)} disabled={locked} />
          </Field>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Commission">
            <Select value={form.commissionType} onValueChange={set("commissionType")} disabled={locked}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMISSION_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {form.commissionType === "CUSTOM" && (
            <Field label="Custom commission %">
              <Input type="number" min={0} max={50} value={form.commissionCustomPct ?? ""} onChange={(e) => set("commissionCustomPct")(e.target.value)} disabled={locked} />
            </Field>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Execution lead (partner)">
            <Select value={form.executionLeadId || "__none"} onValueChange={(v) => set("executionLeadId")(v === "__none" ? "" : v)} disabled={locked}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">None</SelectItem>
                {(team || []).filter((m) => m.isPartner).map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Signed contract value (₹) — optional">
            <Input type="number" min={0} value={form.contractValue ?? ""} onChange={(e) => set("contractValue")(e.target.value)}
              placeholder="Overrides calculated quote when set" disabled={locked} />
          </Field>
        </div>

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={locked || update.isPending}>
            {update.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
        {locked && (
          <p className="text-xs text-muted">Estimate is locked because the linked prospect has moved past Lead. Move the prospect back to Lead to edit.</p>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }

function initial(e) {
  return {
    name: e.name || "",
    type: e.type || "FIXED",
    durationWeeks: e.durationWeeks ?? 8,
    margin: e.margin ?? 40,
    commissionType: e.commissionType || "NONE",
    commissionCustomPct: e.commissionCustomPct ?? "",
    contractValue: e.contractValue ?? "",
    executionLeadId: e.executionLeadId || "",
  };
}
