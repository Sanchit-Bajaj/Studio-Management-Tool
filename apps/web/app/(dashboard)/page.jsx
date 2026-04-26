"use client";
import Link from "next/link";
import { ArrowRight, TrendingUp, Wallet, Calendar, Briefcase, FolderKanban, Users, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/PageHeader";
import { useDashboard } from "@/hooks/useDashboard";
import { fmt, fmtPct } from "@/lib/utils";
import { STAGES } from "@/lib/constants";

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  return (
    <div className="p-8 max-w-7xl space-y-6">
      <PageHeader
        title="Dashboard"
        description="Studio-wide P&L, pipeline, and operating cost overview."
      />

      {isLoading ? (
        <DashboardSkeleton />
      ) : !data ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={TrendingUp}
              title="No studio data yet"
              description="Start by creating your studio profile, team, and prospects."
              action={<Link href="/settings"><span className="inline-flex items-center gap-2 rounded-md bg-accent text-white px-4 py-2 text-sm font-medium">Go to settings <ArrowRight className="w-4 h-4" /></span></Link>}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <KpiGrid kpis={data.kpis} />
          <div className="grid lg:grid-cols-3 gap-6">
            <PipelineSection pipeline={data.pipeline} />
            <PartnersSection partners={data.partners} />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <PayrollSection team={data.teamPayroll} />
            <SoftwareSection software={data.software} />
          </div>
        </>
      )}
    </div>
  );
}

function KpiGrid({ kpis }) {
  const tiles = [
    { label: "Won revenue (FY)", value: fmt(kpis.wonRevenue), icon: TrendingUp, sub: `${kpis.wonProjectCount} project${kpis.wonProjectCount === 1 ? "" : "s"}` },
    { label: "Net profit after tax", value: fmt(kpis.netProfitAfterTax), icon: Wallet, sub: kpis.wonRevenue > 0 ? fmtPct((kpis.netProfitAfterTax / kpis.wonRevenue) * 100) : "—" },
    { label: "Monthly burn", value: fmt(kpis.monthlyBurn), icon: Calendar, sub: "Salaries + software + overheads" },
    { label: "Runway", value: kpis.runwayMonths > 0 ? `${kpis.runwayMonths.toFixed(1)} mo` : "—", icon: Briefcase, sub: kpis.monthlyBurn > 0 ? "Won revenue ÷ burn" : "Set monthly burn" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {tiles.map((t) => (
        <Card key={t.label}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide">{t.label}</p>
                <p className="text-2xl font-semibold text-ink mt-1 truncate">{t.value}</p>
                <p className="text-xs text-muted mt-0.5">{t.sub}</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-sand grid place-items-center shrink-0">
                <t.icon className="w-4 h-4 text-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PipelineSection({ pipeline }) {
  const total = pipeline.reduce((s, p) => s + (p.weightedRevenue || 0), 0);
  const byStage = STAGES.filter((s) => s.value !== "LOST").map((stage) => ({
    ...stage,
    items: pipeline.filter((p) => p.stage === stage.value),
  }));

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Weighted pipeline</CardTitle>
          <Badge variant="accent">{fmt(total)}</Badge>
        </div>
        <p className="text-sm text-muted">Each prospect's estimate × stage probability.</p>
      </CardHeader>
      <CardContent>
        {pipeline.length === 0 ? (
          <EmptyState icon={FolderKanban} title="No active prospects" />
        ) : (
          <div className="space-y-5">
            {byStage.map((stage) => stage.items.length > 0 && (
              <div key={stage.value}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={stage.badge}>{stage.label}</Badge>
                  <span className="text-xs text-muted">{stage.items.length}</span>
                </div>
                <div className="space-y-2">
                  {stage.items.map((p) => (
                    <Link key={p.id} href={`/prospects/${p.id}`} className="flex items-center justify-between gap-3 rounded-md hover:bg-sand p-2 -mx-2 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{p.projectName}</p>
                        <p className="text-xs text-muted truncate">{p.clientName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-ink">{fmt(p.weightedRevenue || 0)}</p>
                        <p className="text-xs text-muted">{fmt(p.estimateRevenue || 0)} × prob</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PartnersSection({ partners }) {
  const total = partners.reduce((s, p) => s + p.totalPayout, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Partner distribution (FY)</CardTitle>
        <p className="text-sm text-muted">From won engagements only.</p>
      </CardHeader>
      <CardContent>
        {partners.length === 0 ? (
          <EmptyState icon={Users} title="No partners" description="Mark members as partners on the Team page." />
        ) : (
          <div className="space-y-3">
            {partners.map((p) => {
              const pct = total > 0 ? (p.totalPayout / total) * 100 : 0;
              return (
                <div key={p.memberId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{p.name}</span>
                    <span className="font-medium text-ink">{fmt(p.totalPayout)}</span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
            <Separator className="my-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Total payouts</span>
              <span className="font-semibold text-ink">{fmt(total)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PayrollSection({ team }) {
  const total = team.reduce((s, m) => s + m.cost, 0);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Active payroll</CardTitle>
          <Badge>{fmt(total)}/mo</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {team.length === 0 ? (
          <EmptyState icon={Users} title="No active members" />
        ) : (
          <div className="space-y-3">
            {team.map((m) => (
              <div key={m.memberId} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink">{m.name}</span>
                  <span className="text-ink">{fmt(m.cost)}</span>
                </div>
                <Progress value={m.share} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SoftwareSection({ software }) {
  const total = software.reduce((s, sw) => s + sw.monthlyCost, 0);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Software & subscriptions</CardTitle>
          <Badge>{fmt(total)}/mo</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {software.length === 0 ? (
          <EmptyState icon={Package} title="No software" />
        ) : (
          <div className="space-y-2">
            {software.map((sw) => (
              <div key={sw.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{sw.name}</p>
                  <p className="text-xs text-muted">{sw.seats} seat{sw.seats === 1 ? "" : "s"}</p>
                </div>
                <p className="text-ink">{fmt(sw.monthlyCost)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
