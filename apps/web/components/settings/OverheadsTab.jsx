"use client";
import { useState } from "react";
import { Pencil, Plus, Trash2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverheads, useCreateOverhead, useUpdateOverhead, useStopOverhead, useResumeOverhead, useDeleteOverhead } from "@/hooks/useOverheads";
import { fmt } from "@/lib/utils";

const CATEGORIES = [
  { value: "RENT", label: "Rent" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "INTERNET", label: "Internet" },
  { value: "MISC", label: "Misc" },
  { value: "OTHER", label: "Other" },
];

export function OverheadsTab() {
  const { data, isLoading } = useOverheads();
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const items = data || [];
  const total = items
    .filter((i) => !i.endDate || new Date(i.endDate) > new Date())
    .reduce((s, i) => s + i.amount, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Overheads</CardTitle>
          <p className="text-sm text-muted mt-1">Active monthly: <span className="font-medium text-ink">{fmt(total)}</span></p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" /> Add overhead
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center">No overheads yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => <Row key={item.id} item={item} onEdit={() => { setEditing(item); setDialogOpen(true); }} />)}
          </div>
        )}
      </CardContent>

      <OverheadDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </Card>
  );
}

function Row({ item, onEdit }) {
  const stopped = item.endDate && new Date(item.endDate) <= new Date();
  const stop = useStopOverhead();
  const resume = useResumeOverhead();
  const del = useDeleteOverhead();

  return (
    <div className="flex items-center justify-between py-3 gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-ink truncate">{item.label}</p>
          <Badge variant={stopped ? "default" : "success"}>{stopped ? "Stopped" : "Active"}</Badge>
        </div>
        <p className="text-xs text-muted mt-0.5">{CATEGORIES.find((c) => c.value === item.category)?.label}</p>
      </div>
      <div className="text-right">
        <p className="font-medium text-ink">{fmt(item.amount)}</p>
        <p className="text-xs text-muted">/month</p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="w-4 h-4" /></Button>
        {stopped ? (
          <Button variant="ghost" size="icon" onClick={() => resume.mutate(item.id)}><Play className="w-4 h-4" /></Button>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => stop.mutate({ id: item.id, date: new Date().toISOString() })}><Pause className="w-4 h-4" /></Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete "${item.label}"?`)) del.mutate(item.id); }}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
}

function OverheadDialog({ open, onOpenChange, editing }) {
  const [form, setForm] = useState({ category: "MISC", label: "", amount: 0 });
  const create = useCreateOverhead();
  const update = useUpdateOverhead();

  // reset form whenever the dialog opens
  if (open && form.__id !== (editing?.id || "new")) {
    setForm({
      __id: editing?.id || "new",
      category: editing?.category || "MISC",
      label: editing?.label || "",
      amount: editing?.amount || 0,
    });
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = { category: form.category, label: form.label, amount: Number(form.amount) };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...payload });
      else await create.mutateAsync(payload);
      onOpenChange(false);
    } catch {/* toast already shown */}
  };

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit overhead" : "Add overhead"}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Monthly amount (₹)</Label>
            <Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
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
