"use client";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeam, useCreateMember, useUpdateMember, useDeleteMember } from "@/hooks/useTeam";
import { useRoles } from "@/hooks/useRoles";
import { fmt } from "@/lib/utils";

export function MembersTab() {
  const { data: team, isLoading } = useTeam();
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Team members</CardTitle>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Add member
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
        ) : !team?.length ? (
          <p className="text-sm text-muted py-8 text-center">No team members yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {team.map((m) => <Row key={m.id} member={m} onEdit={() => { setEditing(m); setOpen(true); }} />)}
          </div>
        )}
      </CardContent>
      <MemberDialog open={open} onOpenChange={setOpen} editing={editing} />
    </Card>
  );
}

function Row({ member, onEdit }) {
  const del = useDeleteMember();
  return (
    <div className="flex items-center justify-between py-3 gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-ink truncate">{member.name}</p>
          {member.isPartner && <Badge variant="accent">Partner</Badge>}
          {!member.isActive && <Badge variant="default">Inactive</Badge>}
        </div>
        <p className="text-xs text-muted mt-0.5">{member.role?.name || "No role"}</p>
      </div>
      <div className="text-right">
        <p className="font-medium text-ink">{fmt(member.monthlyCost)}</p>
        <p className="text-xs text-muted">/month</p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remove ${member.name}?`)) del.mutate(member.id); }}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
}

function MemberDialog({ open, onOpenChange, editing }) {
  const { data: roles } = useRoles();
  const create = useCreateMember();
  const update = useUpdateMember();
  const [form, setForm] = useState({});

  if (open && form.__id !== (editing?.id || "new")) {
    setForm({
      __id: editing?.id || "new",
      name: editing?.name || "",
      roleId: editing?.roleId || "",
      monthlyCost: editing?.monthlyCost ?? 0,
      isActive: editing?.isActive ?? true,
      isPartner: editing?.isPartner ?? false,
      equityPct: editing?.equityPct ?? 0,
      execPremPct: editing?.execPremPct ?? 0,
      bdevPremPct: editing?.bdevPremPct ?? 0,
      experience: editing?.experience || "",
    });
  }

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      roleId: form.roleId || null,
      monthlyCost: Number(form.monthlyCost),
      isActive: form.isActive,
      isPartner: form.isPartner,
      equityPct: Number(form.equityPct) || 0,
      execPremPct: Number(form.execPremPct) || 0,
      bdevPremPct: Number(form.bdevPremPct) || 0,
      experience: form.experience || "",
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...payload });
      else await create.mutateAsync(payload);
      onOpenChange(false);
    } catch {/* toast shown */}
  };

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{editing ? "Edit member" : "Add team member"}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name *">
              <Input value={form.name} onChange={(e) => set("name")(e.target.value)} required />
            </Field>
            <Field label="Role">
              <Select value={form.roleId || "__none"} onValueChange={(v) => set("roleId")(v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No role</SelectItem>
                  {(roles || []).map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Monthly cost (₹)">
              <Input type="number" min={0} value={form.monthlyCost} onChange={(e) => set("monthlyCost")(e.target.value)} required />
            </Field>
            <Field label="Experience">
              <Input value={form.experience} onChange={(e) => set("experience")(e.target.value)} placeholder="e.g. 3–5 yrs" />
            </Field>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <Label className="text-sm normal-case tracking-normal text-ink font-medium">Active</Label>
            <Switch checked={form.isActive} onCheckedChange={set("isActive")} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <Label className="text-sm normal-case tracking-normal text-ink font-medium">Partner</Label>
            <Switch checked={form.isPartner} onCheckedChange={set("isPartner")} />
          </div>

          {form.isPartner && (
            <div className="grid sm:grid-cols-3 gap-3 rounded-md bg-sand/50 border border-border p-3">
              <Field label="Equity %">
                <Input type="number" min={0} max={100} value={form.equityPct} onChange={(e) => set("equityPct")(e.target.value)} />
              </Field>
              <Field label="Exec premium %">
                <Input type="number" min={0} max={100} value={form.execPremPct} onChange={(e) => set("execPremPct")(e.target.value)} />
              </Field>
              <Field label="BDev premium %">
                <Input type="number" min={0} max={100} value={form.bdevPremPct} onChange={(e) => set("bdevPremPct")(e.target.value)} />
              </Field>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : editing ? "Save" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
