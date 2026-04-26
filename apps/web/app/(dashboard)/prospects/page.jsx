"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, FolderKanban, Trash2, Pencil, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProspectDialog } from "@/components/prospects/ProspectDialog";
import { useProspects, useDeleteProspect, useUpdateProspect } from "@/hooks/useProspects";
import { STAGES } from "@/lib/constants";

export default function ProspectsPage() {
  const { data, isLoading } = useProspects();
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const grouped = STAGES.reduce((acc, s) => {
    acc[s.value] = (data || []).filter((p) => p.stage === s.value);
    return acc;
  }, {});

  return (
    <div className="p-8">
      <PageHeader
        title="Pipeline"
        description="Prospects and their stages. Linked estimates surface on each card."
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="w-4 h-4" /> New prospect
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ))}
        </div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={FolderKanban}
              title="No prospects yet"
              description="Add your first prospect to start tracking deal flow."
              action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="w-4 h-4" /> New prospect</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {STAGES.map((stage) => (
            <div key={stage.value} className="flex flex-col gap-3 min-w-0">
              <div className="flex items-center justify-between px-1">
                <Badge variant={stage.badge}>{stage.label}</Badge>
                <span className="text-xs text-muted">{grouped[stage.value].length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {grouped[stage.value].map((p) => (
                  <ProspectCard key={p.id} prospect={p} onEdit={() => { setEditing(p); setOpen(true); }} />
                ))}
                {grouped[stage.value].length === 0 && (
                  <div className="rounded-md border border-dashed border-border bg-white/50 p-4 text-xs text-muted text-center">
                    No prospects
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ProspectDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function ProspectCard({ prospect, onEdit }) {
  const del = useDeleteProspect();
  const update = useUpdateProspect();

  return (
    <Card className="group">
      <CardContent className="p-4 space-y-3">
        <div className="space-y-0.5">
          <Link href={`/prospects/${prospect.id}`} className="font-medium text-ink hover:text-accent transition-colors block truncate">
            {prospect.projectName}
          </Link>
          <p className="text-xs text-muted truncate">{prospect.clientName}</p>
        </div>

        {prospect.estimate && (
          <Link href={`/estimates/${prospect.estimate.id}`} className="flex items-center gap-1 text-xs text-accent hover:underline">
            <ArrowRight className="w-3 h-3" /> {prospect.estimate.name}
          </Link>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
          <Select value={prospect.stage} onValueChange={(v) => update.mutate({ id: prospect.id, stage: v })}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7"><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete "${prospect.projectName}"?`)) del.mutate(prospect.id); }} className="h-7 w-7">
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
