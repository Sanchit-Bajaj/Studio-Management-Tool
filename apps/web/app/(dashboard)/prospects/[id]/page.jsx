"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ValueSignalsCard } from "@/components/prospects/ValueSignalsCard";
import { ProspectDialog } from "@/components/prospects/ProspectDialog";
import { useProspect, useDeleteProspect, useUpdateProspect } from "@/hooks/useProspects";
import { useCreateEstimate } from "@/hooks/useEstimates";
import { STAGES } from "@/lib/constants";

export default function ProspectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: prospect, isLoading } = useProspect(id);
  const update = useUpdateProspect();
  const del = useDeleteProspect();
  const createEst = useCreateEstimate();
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-60" />
      </div>
    );
  }
  if (!prospect) {
    return <div className="p-8"><p className="text-sm text-muted">Prospect not found.</p></div>;
  }

  const stage = STAGES.find((s) => s.value === prospect.stage);

  const onCreateEstimate = async () => {
    try {
      const data = await createEst.mutateAsync({
        name: `${prospect.projectName} — Estimate`,
        type: "FIXED",
        durationWeeks: 8,
        margin: 40,
        prospectId: prospect.id,
      });
      router.push(`/estimates/${data.id}`);
    } catch {/* toast */}
  };

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/prospects" className="text-muted hover:text-ink flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to pipeline
        </Link>
      </div>

      <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{prospect.projectName}</h1>
            <Badge variant={stage?.badge}>{stage?.label}</Badge>
          </div>
          <p className="text-sm text-muted">{prospect.clientName} {prospect.domain && `· ${prospect.domain}`}</p>
        </div>
        <div className="flex gap-2">
          <Select value={prospect.stage} onValueChange={(v) => update.mutate({ id: prospect.id, stage: v })}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="w-4 h-4" /> Edit</Button>
          <Button variant="ghost" onClick={() => { if (confirm("Delete this prospect?")) { del.mutate(prospect.id); router.push("/prospects"); } }}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ValueSignalsCard prospect={prospect} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Contact" value={prospect.contactName} />
              <Row label="Email" value={prospect.email} />
              <Row label="Phone" value={prospect.phone} />
              <Row label="Website" value={prospect.website} link />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Estimate</CardTitle>
              {!prospect.estimate && (
                <Button size="sm" onClick={onCreateEstimate} disabled={createEst.isPending}>
                  <Plus className="w-4 h-4" /> Create
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {prospect.estimate ? (
                <Link href={`/estimates/${prospect.estimate.id}`} className="flex items-center gap-2 text-sm text-accent hover:underline">
                  <FileText className="w-4 h-4" /> {prospect.estimate.name}
                </Link>
              ) : (
                <p className="text-sm text-muted">No estimate yet. Create one to start the cost builder + profit calculator.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ProspectDialog open={editOpen} onOpenChange={setEditOpen} editing={prospect} />
    </div>
  );
}

function Row({ label, value, link }) {
  if (!value) return <div className="flex justify-between text-muted"><span>{label}</span><span>—</span></div>;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      {link ? (
        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer" className="text-accent hover:underline truncate">{value}</a>
      ) : (
        <span className="text-ink truncate">{value}</span>
      )}
    </div>
  );
}
