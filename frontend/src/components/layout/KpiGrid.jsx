import { TrendingUp } from "lucide-react";

// ─── Skeleton de una tarjeta KPI ─────────────────────────────────────────────
function KpiCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* Fila superior: label + ícono */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 animate-pulse rounded bg-gray-800" />
        <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-800" />
      </div>
      {/* Número grande */}
      <div className="mt-4 h-8 w-20 animate-pulse rounded bg-gray-800" />
      {/* Delta */}
      <div className="mt-2 h-3 w-40 animate-pulse rounded bg-gray-800" />
    </div>
  );
}

function KpiCard({ kpi }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{kpi.label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
          <kpi.icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
        {kpi.value}
      </p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <TrendingUp className="h-3 w-3 text-primary" />
        {kpi.delta}
      </p>
    </div>
  );
}

export default function KpiGrid({ metrics = [], isLoading = false }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {isLoading
        ? Array.from({ length: 3 }).map((_, i) => <KpiCardSkeleton key={i} />)
        : metrics.map((kpi) => <KpiCard key={kpi.label} kpi={kpi} />)}
    </div>
  );
}
