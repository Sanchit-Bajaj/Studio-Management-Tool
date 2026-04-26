"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSetAllocations } from "@/hooks/useEstimates";
import { fmt } from "@/lib/utils";

export function AllocationsCard({ estimate, team, locked }) {
  const [rows, setRows] = useState(() => fromEstimate(estimate));
  const setAllocs = useSetAllocations();

  useEffect(() => { setRows(fromEstimate(estimate)); }, [estimate.id]);

  const isRetainer = estimate.type === "RETAINER";

  const usedIds = useMemo(() => new Set(rows.map((r) => r.memberId)), [rows]);
  const available = (team || []).filter((m) => !usedIds.has(m.id) && m.isActive);

  const addRow = (memberId) => {
    setRows((rs) => [
      ...rs,
      { memberId, allocationPct: 50, weeks: estimate.durationWeeks || 8, margin: isRetainer ? 50 : null },
    ]);
  };

  const updateRow = (idx, patch) => {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeRow = (idx) => setRows((rs) => rs.filter((_, i) => i !== idx));

  const onSave = () => {
    setAllocs.mutate({
      id: estimate.id,
      allocations: rows.map((r) => ({
        memberId: r.memberId,
        allocationPct: Number(r.allocationPct) || 0,
        weeks: r.weeks != null ? Number(r.weeks) : null,
        margin: r.margin != null ? Number(r.margin) : null,
      })),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Team allocations</CardTitle>
        <div className="flex items-center gap-2">
          {available.length > 0 && !locked && (
            <Select value="__add" onValueChange={(v) => v !== "__add" && addRow(v)}>
              <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="Add member" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__add" disabled>Add member</SelectItem>
                {available.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" onClick={onSave} disabled={locked || setAllocs.isPending}>
            {setAllocs.isPending ? "Saving…" : "Save allocations"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted py-6 text-center">No team members allocated yet. Add members above.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="w-32">Allocation %</TableHead>
                {!isRetainer && <TableHead className="w-32">Weeks</TableHead>}
                {isRetainer && <TableHead className="w-32">Margin %</TableHead>}
                <TableHead className="text-right">Monthly cost</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => {
                const member = team?.find((m) => m.id === row.memberId);
                if (!member) return null;
                return (
                  <TableRow key={row.memberId}>
                    <TableCell>
                      <p className="font-medium text-ink">{member.name}</p>
                      <p className="text-xs text-muted">{member.role?.name || "No role"}</p>
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={0} max={100} value={row.allocationPct}
                        onChange={(e) => updateRow(idx, { allocationPct: e.target.value })} disabled={locked} className="h-8" />
                    </TableCell>
                    {!isRetainer && (
                      <TableCell>
                        <Input type="number" min={0} value={row.weeks ?? ""}
                          onChange={(e) => updateRow(idx, { weeks: e.target.value })} disabled={locked} className="h-8" />
                      </TableCell>
                    )}
                    {isRetainer && (
                      <TableCell>
                        <Input type="number" min={0} max={300} value={row.margin ?? ""}
                          onChange={(e) => updateRow(idx, { margin: e.target.value })} disabled={locked} className="h-8" />
                      </TableCell>
                    )}
                    <TableCell className="text-right text-muted">{fmt(member.monthlyCost)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeRow(idx)} disabled={locked}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function fromEstimate(e) {
  return (e.allocations || []).map((a) => ({
    memberId: a.memberId,
    allocationPct: a.allocationPct,
    weeks: a.weeks,
    margin: a.margin,
  }));
}
