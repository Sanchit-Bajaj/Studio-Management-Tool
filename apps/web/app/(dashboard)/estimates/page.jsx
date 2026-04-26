"use client";
import { useState } from "react";
import Link from "next/link";
import { Briefcase, Plus, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { EstimateDialog } from "@/components/estimates/EstimateDialog";
import { useEstimates, useDeleteEstimate } from "@/hooks/useEstimates";
import { fmt } from "@/lib/utils";
import { STAGES } from "@/lib/constants";

export default function EstimatesPage() {
  const { data, isLoading } = useEstimates();
  const [open, setOpen] = useState(false);
  const del = useDeleteEstimate();

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Estimates"
        description="Cost builder + profit calculator for fixed and retainer engagements."
        actions={<Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> New estimate</Button>}
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
          ) : !data?.length ? (
            <EmptyState
              icon={Briefcase}
              title="No estimates yet"
              description="Create one to start the cost builder. You can link it to a prospect at any time."
              action={<Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> New estimate</Button>}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Linked prospect</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Contract</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((est) => {
                  const stage = est.prospect ? STAGES.find((s) => s.value === est.prospect.stage) : null;
                  return (
                    <TableRow key={est.id}>
                      <TableCell>
                        <Link href={`/estimates/${est.id}`} className="font-medium text-ink hover:text-accent flex items-center gap-1">
                          {est.name} <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
                        </Link>
                      </TableCell>
                      <TableCell>
                        {est.prospect ? (
                          <Link href={`/prospects/${est.prospect.id}`} className="text-sm text-muted hover:text-ink">
                            {est.prospect.projectName}
                            {stage && <Badge variant={stage.badge} className="ml-2">{stage.label}</Badge>}
                          </Link>
                        ) : <span className="text-muted">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={est.type === "RETAINER" ? "info" : "default"}>{est.type === "RETAINER" ? "Retainer" : "Fixed"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{est.durationWeeks ? `${est.durationWeeks}w` : "—"}</TableCell>
                      <TableCell className="text-right">{est.margin != null ? `${est.margin}%` : "—"}</TableCell>
                      <TableCell className="text-right">{est.contractValue ? fmt(est.contractValue) : <span className="text-muted">—</span>}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); if (confirm(`Delete "${est.name}"?`)) del.mutate(est.id); }}>
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

      <EstimateDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
