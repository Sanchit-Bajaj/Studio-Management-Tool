"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEstimate, useDeleteEstimate } from "@/hooks/useEstimates";
import { useTeam } from "@/hooks/useTeam";
import { useSoftware } from "@/hooks/useSoftware";
import { useOverheads } from "@/hooks/useOverheads";
import { useSettings } from "@/hooks/useSettings";
import { EstimateSettingsCard } from "@/components/estimates/EstimateSettingsCard";
import { AllocationsCard } from "@/components/estimates/AllocationsCard";
import { ExclusionsCard } from "@/components/estimates/ExclusionsCard";
import { ProfitCalculator } from "@/components/estimates/ProfitCalculator";
import { fmt, fmtPct } from "@/lib/utils";
import { STAGES, ESTIMATE_TYPES } from "@/lib/constants";

export default function EstimateDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const { data: estimate, isLoading } = useEstimate(id);
  const { data: team } = useTeam();
  const { data: software } = useSoftware();
  const { data: overheads } = useOverheads();
  const { data: studio } = useSettings();
  const del = useDeleteEstimate();

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4"><Skeleton className="h-64" /><Skeleton className="h-80" /></div>
          <div className="lg:col-span-2 space-y-4"><Skeleton className="h-96" /></div>
        </div>
      </div>
    );
  }
  if (!estimate) return <div className="p-8"><p className="text-sm text-muted">Estimate not found.</p></div>;

  const calc = estimate.calc;
  const stage = estimate.prospect ? STAGES.find((s) => s.value === estimate.prospect.stage) : null;
  const locked = estimate.prospect && estimate.prospect.stage !== "LEAD";
  const typeLabel = ESTIMATE_TYPES.find((t) => t.value === estimate.type)?.label;

  return (
    <div className="p-8 max-w-7xl space-y-6">
      <Link href="/estimates" className="text-muted hover:text-ink flex items-center gap-1 text-sm w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to estimates
      </Link>

      <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{estimate.name}</h1>
            <Badge variant={estimate.type === "RETAINER" ? "info" : "default"}>{typeLabel}</Badge>
            {locked && <Badge variant="warn">Locked</Badge>}
            {stage && <Badge variant={stage.badge}>{stage.label}</Badge>}
          </div>
          {estimate.prospect && (
            <Link href={`/prospects/${estimate.prospect.id}`} className="text-sm text-muted hover:text-ink flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> {estimate.prospect.projectName} — {estimate.prospect.clientName}
            </Link>
          )}
        </div>
        <Button variant="ghost" onClick={() => { if (confirm("Delete this estimate?")) { del.mutate(estimate.id); router.push("/estimates"); } }}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>

      <KpiBar calc={calc} contractValue={estimate.contractValue} />

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="settings">
            <TabsList>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="allocations">Allocations</TabsTrigger>
              <TabsTrigger value="exclusions">Exclusions</TabsTrigger>
            </TabsList>
            <TabsContent value="settings"><EstimateSettingsCard estimate={estimate} team={team} locked={locked} /></TabsContent>
            <TabsContent value="allocations"><AllocationsCard estimate={estimate} team={team} locked={locked} /></TabsContent>
            <TabsContent value="exclusions"><ExclusionsCard estimate={estimate} software={software} overheads={overheads} locked={locked} /></TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-2">
          <ProfitCalculator estimate={estimate} calc={calc} studio={studio} team={team} />
        </div>
      </div>
    </div>
  );
}

function KpiBar({ calc, contractValue }) {
  const revenue = contractValue ? Number(contractValue) : (calc?.revenue || 0);
  const tiles = [
    { label: "Revenue", value: fmt(revenue), sub: contractValue ? "Signed contract" : "Calculated quote" },
    { label: "Total cost", value: fmt(calc?.totalCost || 0), sub: `Team + software + overheads` },
    { label: "Gross profit", value: fmt(calc?.grossProfit || 0), sub: fmtPct(calc?.grossMarginPct || 0) },
    { label: "Net profit (after tax)", value: fmt(calc?.netProfit || 0), sub: fmtPct(calc?.netMarginPct || 0) },
  ];
  return (
    <Card>
      <CardContent className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border p-0">
        {tiles.map((t) => (
          <div key={t.label} className="p-5">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">{t.label}</p>
            <p className="text-xl font-semibold text-ink mt-1">{t.value}</p>
            <p className="text-xs text-muted mt-0.5">{t.sub}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
