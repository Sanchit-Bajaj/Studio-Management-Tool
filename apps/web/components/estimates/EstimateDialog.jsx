"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateEstimate } from "@/hooks/useEstimates";
import { useProspects } from "@/hooks/useProspects";
import { ESTIMATE_TYPES } from "@/lib/constants";

export function EstimateDialog({ open, onOpenChange, defaultProspectId }) {
  const router = useRouter();
  const create = useCreateEstimate();
  const { data: prospects } = useProspects();
  const [form, setForm] = useState({});

  if (open && form.__opened !== open) {
    setForm({
      __opened: open,
      name: "",
      type: "FIXED",
      durationWeeks: 8,
      margin: 40,
      prospectId: defaultProspectId || "",
    });
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await create.mutateAsync({
        name: form.name,
        type: form.type,
        durationWeeks: Number(form.durationWeeks) || null,
        margin: form.type === "FIXED" ? Number(form.margin) : null,
        prospectId: form.prospectId || null,
      });
      onOpenChange(false);
      router.push(`/estimates/${data.id}`);
    } catch {/* */}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New estimate</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Name *">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Acme Co — Brand system" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTIMATE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label={form.type === "RETAINER" ? "Length (weeks, optional)" : "Duration (weeks)"}>
              <Input type="number" min={1} value={form.durationWeeks} onChange={(e) => setForm({ ...form, durationWeeks: e.target.value })} />
            </Field>
          </div>
          {form.type === "FIXED" && (
            <Field label="Margin %">
              <Input type="number" min={0} max={99} value={form.margin} onChange={(e) => setForm({ ...form, margin: e.target.value })} />
            </Field>
          )}
          <Field label="Link to prospect (optional)">
            <Select value={form.prospectId || "__none"} onValueChange={(v) => setForm({ ...form, prospectId: v === "__none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Select prospect" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No prospect</SelectItem>
                {(prospects || []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.projectName} — {p.clientName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
