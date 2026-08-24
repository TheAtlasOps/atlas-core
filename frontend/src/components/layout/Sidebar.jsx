import { LayoutDashboard, ClipboardList, Database, Link2, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Dispatch Board", icon: LayoutDashboard, path: "/" },
  { label: "Work Orders", icon: ClipboardList, path: "/work-orders" },
  { label: "SIM Inventory", icon: Database, path: "/sim-inventory" },
  { label: "Magic Links", icon: Link2, path: "/magic-links" },
  { label: "Settings", icon: Settings, path: "/settings" },
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
          <NavLink
            key={item.label}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto p-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Entel FSM</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Plataforma de Field Service Management.
          </p>
        </div>
      </div>
    </aside>
  );
}
