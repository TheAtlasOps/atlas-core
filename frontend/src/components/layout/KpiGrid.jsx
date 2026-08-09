import { TrendingUp } from "lucide-react";

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

export default function KpiGrid({ metrics = [] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((kpi) => (
        <KpiCard key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}
