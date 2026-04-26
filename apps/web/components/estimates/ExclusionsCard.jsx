"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSetExclusions } from "@/hooks/useEstimates";
import { fmt } from "@/lib/utils";

export function ExclusionsCard({ estimate, software, overheads, locked }) {
  const [excludedSw, setExcludedSw] = useState(new Set());
  const [excludedOh, setExcludedOh] = useState(new Set());
  const setExc = useSetExclusions();

  useEffect(() => {
    setExcludedSw(new Set((estimate.exclusions || []).filter((e) => e.softwareId).map((e) => e.softwareId)));
    setExcludedOh(new Set((estimate.exclusions || []).filter((e) => e.overheadId).map((e) => e.overheadId)));
  }, [estimate.id]);

  const toggle = (set, setter) => (id) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const onSave = () => {
    setExc.mutate({
      id: estimate.id,
      excludedSoftwareIds: [...excludedSw],
      excludedOverheadIds: [...excludedOh],
    });
  };

  const activeOh = (overheads || []).filter((o) => !o.endDate || new Date(o.endDate) > new Date());

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Cost exclusions</CardTitle>
          <p className="text-sm text-muted mt-1">Tick items that should not be billed against this engagement.</p>
        </div>
        <Button size="sm" onClick={onSave} disabled={locked || setExc.isPending}>
          {setExc.isPending ? "Saving…" : "Save exclusions"}
        </Button>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-6">
        <ListSection
          title="Software"
          items={(software || []).map((sw) => ({ id: sw.id, label: sw.name, sub: `${fmt(sw.costPerSeat)}/seat`, excluded: excludedSw.has(sw.id) }))}
          onToggle={toggle(excludedSw, setExcludedSw)}
          locked={locked}
        />
        <ListSection
          title="Overheads"
          items={activeOh.map((oh) => ({ id: oh.id, label: oh.label, sub: `${fmt(oh.amount)}/month`, excluded: excludedOh.has(oh.id) }))}
          onToggle={toggle(excludedOh, setExcludedOh)}
          locked={locked}
        />
      </CardContent>
    </Card>
  );
}

function ListSection({ title, items, onToggle, locked }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted">No items.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((it) => (
            <label key={it.id} className="flex items-center gap-3 rounded-md border border-border bg-white p-2.5 cursor-pointer hover:bg-sand/50">
              <input type="checkbox" checked={!it.excluded} onChange={() => onToggle(it.id)} disabled={locked} className="h-4 w-4 accent-accent" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{it.label}</p>
                <p className="text-xs text-muted">{it.sub}</p>
              </div>
              {it.excluded && <span className="text-xs text-muted">excluded</span>}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
