import { LayoutDashboard, Columns3, BarChart3, Settings } from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Kanban", icon: Columns3, active: false },
  { label: "Team Metrics", icon: BarChart3, active: false },
  { label: "Settings", icon: Settings, active: false },
];

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-2 px-6 h-16 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <span className="text-primary-foreground font-bold text-lg leading-none">
            A
          </span>
        </div>
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Atlas
        </span>
      </div>
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => (
          <a
            key={item.label}
            href="#"
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
              item.active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </a>
        ))}
      </nav>
      <div className="mt-auto p-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Pro Plan</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Unlock advanced metrics and unlimited AI insights.
          </p>
          <button className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
            Upgrade
          </button>
        </div>
      </div>
    </aside>
  );
}
