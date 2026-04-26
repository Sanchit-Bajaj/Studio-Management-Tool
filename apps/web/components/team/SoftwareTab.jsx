"use client";
import { useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useSoftware, useCreateSoftware, useUpdateSoftware, useDeleteSoftware, useSetSoftwareAssignments } from "@/hooks/useSoftware";
import { useTeam } from "@/hooks/useTeam";
import { fmt } from "@/lib/utils";

export function SoftwareTab() {
  const { data: software, isLoading } = useSoftware();
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [assignFor, setAssignFor] = useState(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Software & subscriptions</CardTitle>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Add software
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
        ) : !software?.length ? (
          <p className="text-sm text-muted py-8 text-center">No software tools yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {software.map((sw) => (
              <Row key={sw.id} sw={sw}
                onEdit={() => { setEditing(sw); setOpen(true); }}
                onAssign={() => setAssignFor(sw)} />
            ))}
          </div>
        )}
      </CardContent>
      <SoftwareDialog open={open} onOpenChange={setOpen} editing={editing} />
      <AssignDialog software={assignFor} onClose={() => setAssignFor(null)} />
    </Card>
  );
}

function Row({ sw, onEdit, onAssign }) {
  const del = useDeleteSoftware();
  const seatCount = sw.isSharedLicence ? "Shared" : `${sw.assignments?.length || 0} seat${(sw.assignments?.length || 0) === 1 ? "" : "s"}`;
  return (
    <div className="flex items-center justify-between py-3 gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-ink">{sw.name}</p>
          {sw.isSharedLicence && <Badge>Shared licence</Badge>}
        </div>
        <p className="text-xs text-muted mt-0.5">{seatCount}</p>
      </div>
      <div className="text-right">
        <p className="font-medium text-ink">{fmt(sw.costPerSeat)}</p>
        <p className="text-xs text-muted">/seat/month</p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onAssign} title="Assign members"><Users className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remove ${sw.name}?`)) del.mutate(sw.id); }}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
}

function SoftwareDialog({ open, onOpenChange, editing }) {
  const create = useCreateSoftware();
  const update = useUpdateSoftware();
  const [form, setForm] = useState({});

  if (open && form.__id !== (editing?.id || "new")) {
    setForm({
      __id: editing?.id || "new",
      name: editing?.name || "",
      costPerSeat: editing?.costPerSeat ?? 0,
      isSharedLicence: editing?.isSharedLicence ?? false,
    });
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = { name: form.name, costPerSeat: Number(form.costPerSeat), isSharedLicence: form.isSharedLicence };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...payload });
      else await create.mutateAsync(payload);
      onOpenChange(false);
    } catch {/* */}
  };

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit software" : "Add software"}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Monthly cost per seat (₹)</Label>
            <Input type="number" min={0} value={form.costPerSeat} onChange={(e) => setForm({ ...form, costPerSeat: e.target.value })} required />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label className="text-sm normal-case tracking-normal text-ink font-medium">Shared licence</Label>
              <p className="text-xs text-muted mt-0.5">Single flat cost, available to whole team.</p>
            </div>
            <Switch checked={form.isSharedLicence} onCheckedChange={(v) => setForm({ ...form, isSharedLicence: v })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : editing ? "Save" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({ software, onClose }) {
  const open = !!software;
  const { data: team } = useTeam();
  const assign = useSetSoftwareAssignments();
  const [selected, setSelected] = useState(new Set());

  if (open && selected.__swId !== software.id) {
    const next = new Set((software.assignments || []).map((a) => a.memberId));
    next.__swId = software.id;
    setSelected(next);
  }

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    next.__swId = software.id;
    setSelected(next);
  };

  const onSave = async () => {
    try {
      await assign.mutateAsync({ id: software.id, memberIds: [...selected].filter((v) => typeof v === "string") });
      onClose();
    } catch {/* */}
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign members — {software?.name}</DialogTitle></DialogHeader>
        <div className="max-h-72 overflow-y-auto divide-y divide-border">
          {!team?.length ? (
            <p className="text-sm text-muted py-6 text-center">No team members to assign.</p>
          ) : team.map((m) => (
            <label key={m.id} className="flex items-center gap-3 py-2 cursor-pointer">
              <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} className="h-4 w-4 accent-accent" />
              <span className="text-sm text-ink">{m.name}</span>
              <span className="text-xs text-muted ml-auto">{m.role?.name}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} disabled={assign.isPending}>{assign.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
