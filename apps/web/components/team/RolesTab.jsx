"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useRoles, useCreateRole, useDeleteRole } from "@/hooks/useRoles";

const DEPARTMENTS = [
  { value: "DESIGN", label: "Design" },
  { value: "TECHNOLOGY", label: "Technology" },
  { value: "STRATEGY", label: "Strategy" },
  { value: "MANAGEMENT", label: "Management" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "OTHER", label: "Other" },
];

export function RolesTab() {
  const { data: roles, isLoading } = useRoles();
  const [open, setOpen] = useState(false);
  const del = useDeleteRole();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Roles</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> Add role
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : !roles?.length ? (
          <p className="text-sm text-muted py-8 text-center">No roles yet. Roles let you organise members by function.</p>
        ) : (
          <div className="divide-y divide-border">
            {roles.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <p className="font-medium text-ink">{r.name}</p>
                  <Badge>{DEPARTMENTS.find((d) => d.value === r.department)?.label || r.department}</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete role "${r.name}"?`)) del.mutate(r.id); }}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <RoleDialog open={open} onOpenChange={setOpen} />
    </Card>
  );
}

function RoleDialog({ open, onOpenChange }) {
  const create = useCreateRole();
  const [form, setForm] = useState({ name: "", department: "DESIGN" });

  if (open && form.__opened !== open) setForm({ __opened: open, name: "", department: "DESIGN" });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await create.mutateAsync({ name: form.name, department: form.department });
      onOpenChange(false);
    } catch {/* toast shown */}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add role</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Adding…" : "Add"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
