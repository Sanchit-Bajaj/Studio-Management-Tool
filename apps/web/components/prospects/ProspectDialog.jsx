"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProspect, useUpdateProspect } from "@/hooks/useProspects";
import { STAGES } from "@/lib/constants";

export function ProspectDialog({ open, onOpenChange, editing }) {
  const create = useCreateProspect();
  const update = useUpdateProspect();
  const [form, setForm] = useState({});

  if (open && form.__id !== (editing?.id || "new")) {
    setForm({
      __id: editing?.id || "new",
      projectName: editing?.projectName || "",
      clientName: editing?.clientName || "",
      contactName: editing?.contactName || "",
      email: editing?.email || "",
      phone: editing?.phone || "",
      website: editing?.website || "",
      domain: editing?.domain || "",
      stage: editing?.stage || "LEAD",
    });
  }

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      projectName: form.projectName,
      clientName: form.clientName,
      contactName: form.contactName || null,
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      domain: form.domain || null,
      stage: form.stage,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...payload });
      else await create.mutateAsync(payload);
      onOpenChange(false);
    } catch {/* toast */}
  };

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{editing ? "Edit prospect" : "New prospect"}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Project name *">
              <Input value={form.projectName} onChange={(e) => set("projectName")(e.target.value)} required />
            </Field>
            <Field label="Client name *">
              <Input value={form.clientName} onChange={(e) => set("clientName")(e.target.value)} required />
            </Field>
            <Field label="Contact person">
              <Input value={form.contactName} onChange={(e) => set("contactName")(e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
            </Field>
            <Field label="Website">
              <Input value={form.website} onChange={(e) => set("website")(e.target.value)} placeholder="https://" />
            </Field>
            <Field label="Domain / industry">
              <Input value={form.domain} onChange={(e) => set("domain")(e.target.value)} placeholder="e.g. fintech" />
            </Field>
            <Field label="Stage">
              <Select value={form.stage} onValueChange={set("stage")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
