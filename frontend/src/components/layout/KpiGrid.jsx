import { TrendingUp, AlertTriangle } from "lucide-react";

// ─── Skeleton de una tarjeta KPI ─────────────────────────────────────────────
function KpiCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-gray-800" />
          <div className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 animate-pulse rounded-lg bg-slate-200 dark:bg-gray-800" />
        </div>
        <div className="mt-2.5 sm:mt-3 h-7 w-20 animate-pulse rounded bg-slate-200 dark:bg-gray-800" />
      </div>
      <div className="mt-2 h-3.5 w-36 animate-pulse rounded bg-slate-200 dark:bg-gray-800" />
    </div>
  );
}

function KpiCard({ kpi }) {
  const isError = Boolean(kpi.isError);

  return (
    <div
      className={`rounded-xl border bg-card p-4 sm:p-5 transition-colors flex flex-col justify-between min-w-0 ${
        isError ? "border-rose-500/30 bg-rose-500/5" : "border-border"
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate" title={kpi.label}>
            {kpi.label}
          </span>
          <div
            className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg ${
              isError ? "bg-rose-500/15 text-rose-500" : "bg-secondary text-primary"
            }`}
          >
            <kpi.icon className="h-4 w-4" />
          </div>
        </div>
        <p
          className={`mt-2.5 sm:mt-3 text-xl sm:text-2xl font-bold tracking-tight truncate ${
            isError ? "text-rose-500" : "text-foreground"
          }`}
          title={typeof kpi.value === "string" ? kpi.value : undefined}
        >
          {kpi.value}
        </p>
      </div>
      <p
        className={`mt-2 flex items-center gap-1.5 text-xs truncate ${
          isError ? "text-rose-500 font-medium" : "text-muted-foreground"
        }`}
        title={kpi.delta}
      >
        {isError ? (
          <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
        ) : (
          <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
        )}
        <span className="truncate">{kpi.delta}</span>
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
