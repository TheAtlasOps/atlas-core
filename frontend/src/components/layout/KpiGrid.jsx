import { TrendingUp, AlertTriangle } from "lucide-react";

// ─── Skeleton de una tarjeta KPI ─────────────────────────────────────────────
function KpiCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* Fila superior: label + ícono */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-gray-800" />
        <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200 dark:bg-gray-800" />
      </div>
      {/* Número grande */}
      <div className="mt-4 h-8 w-20 animate-pulse rounded bg-slate-200 dark:bg-gray-800" />
      {/* Delta */}
      <div className="mt-2 h-3 w-40 animate-pulse rounded bg-slate-200 dark:bg-gray-800" />
    </div>
  );
}

function KpiCard({ kpi }) {
  const isError = Boolean(kpi.isError);

  return (
    <div
      className={`rounded-xl border bg-card p-5 transition-colors ${
        isError ? "border-rose-500/30 bg-rose-500/5" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{kpi.label}</span>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            isError ? "bg-rose-500/15 text-rose-500" : "bg-secondary text-primary"
          }`}
        >
          <kpi.icon className="h-4 w-4" />
        </div>
      </div>
      <p
        className={`mt-4 text-2xl lg:text-3xl font-semibold tracking-tight whitespace-nowrap ${
          isError ? "text-rose-500" : "text-foreground"
        }`}
      >
        {kpi.value}
      </p>
      <p
        className={`mt-1 flex items-center gap-1 text-xs ${
          isError ? "text-rose-500 font-medium" : "text-muted-foreground"
        }`}
      >
        {isError ? (
          <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0" />
        ) : (
          <TrendingUp className="h-3 w-3 text-primary shrink-0" />
        )}
        {kpi.delta}
      </p>
    </div>
  );
}

export default function KpiGrid({ metrics = [], isLoading = false, error = null }) {
  const skeletonCount = metrics.length || 4;
  const colClass =
    skeletonCount === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";

  if (isLoading) {
    return (
      <div className={`grid gap-4 sm:grid-cols-2 ${colClass}`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error && metrics.length === 0) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-center">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
          No se pudieron cargar los indicadores clave (KPIs)
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${colClass}`}>
      {metrics.map((kpi) => (
        <KpiCard key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}
