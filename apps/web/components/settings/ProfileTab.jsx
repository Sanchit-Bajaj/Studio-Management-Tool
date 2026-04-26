"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpdateSettings } from "@/hooks/useSettings";

const ENTITIES = [
  { value: "LLP", label: "LLP" },
  { value: "PVT_LTD", label: "Pvt Ltd" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "SOLE_PROP", label: "Sole proprietor" },
  { value: "NON_PROFIT", label: "Non-profit" },
];

export function ProfileTab({ studio }) {
  const [form, setForm] = useState(() => initial(studio));
  const update = useUpdateSettings();

  useEffect(() => { setForm(initial(studio)); }, [studio]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const ev = (k) => (e) => set(k)(e.target.value);

  const onSubmit = (e) => {
    e.preventDefault();
    update.mutate({
      ...form,
      email: form.email || null,
      phone: form.phone || null,
      gstin: form.gstin || null,
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader><CardTitle>Studio profile</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Studio name"><Input value={form.name} onChange={ev("name")} required /></Field>
          <Field label="Founder names"><Input value={form.founderNames} onChange={ev("founderNames")} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={ev("email")} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={ev("phone")} /></Field>
          <Field label="Entity">
            <Select value={form.entity} onValueChange={set("entity")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTITIES.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="GSTIN"><Input value={form.gstin} onChange={ev("gstin")} placeholder="22AAAAA0000A1Z5" /></Field>
          <div className="flex items-center justify-between rounded-md border border-border p-3 sm:col-span-2">
            <div>
              <Label className="text-sm normal-case tracking-normal text-ink font-medium">GST registered</Label>
              <p className="text-xs text-muted mt-0.5">Adds 18% GST on top of estimate revenues.</p>
            </div>
            <Switch checked={form.gstRegistered} onCheckedChange={set("gstRegistered")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Working schedule</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Working days per month">
            <Input type="number" min={1} max={31} value={form.workingDaysPerMonth} onChange={(e) => set("workingDaysPerMonth")(Number(e.target.value))} />
          </Field>
          <Field label="Working hours per day">
            <Input type="number" min={1} max={24} value={form.workingHoursPerDay} onChange={(e) => set("workingHoursPerDay")(Number(e.target.value))} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pipeline probabilities</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Lead %">
            <Input type="number" min={0} max={100} value={form.pipelineProbLead} onChange={(e) => set("pipelineProbLead")(Number(e.target.value))} />
          </Field>
          <Field label="Proposal sent %">
            <Input type="number" min={0} max={100} value={form.pipelineProbProposal} onChange={(e) => set("pipelineProbProposal")(Number(e.target.value))} />
          </Field>
          <Field label="Negotiating %">
            <Input type="number" min={0} max={100} value={form.pipelineProbNegotiating} onChange={(e) => set("pipelineProbNegotiating")(Number(e.target.value))} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function initial(s) {
  return {
    name: s?.name ?? "",
    founderNames: s?.founderNames ?? "",
    email: s?.email ?? "",
    phone: s?.phone ?? "",
    gstin: s?.gstin ?? "",
    entity: s?.entity ?? "LLP",
    gstRegistered: !!s?.gstRegistered,
    workingDaysPerMonth: s?.workingDaysPerMonth ?? 22,
    workingHoursPerDay: s?.workingHoursPerDay ?? 6,
    pipelineProbLead: s?.pipelineProbLead ?? 20,
    pipelineProbProposal: s?.pipelineProbProposal ?? 50,
    pipelineProbNegotiating: s?.pipelineProbNegotiating ?? 75,
  };
}
