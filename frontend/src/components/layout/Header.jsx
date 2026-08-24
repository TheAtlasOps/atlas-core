import { useState } from "react";
import { Search, Bell, User, LogOut } from "lucide-react";

export default function Header() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  return (
    <header className="flex items-center gap-4 h-16 shrink-0 border-b border-border px-4 md:px-6">
      <div className="lg:hidden flex h-8 w-8 items-center justify-center rounded-md bg-primary">
        <span className="text-primary-foreground font-bold leading-none">
          A
        </span>
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-xl mx-auto">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Buscar ordenes, tecnicos o SIMs..."
          aria-label="Search"
          className="w-full rounded-md border border-border bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex items-center gap-3">

        {/* Notifications */}
        <div className="relative">
          <button
            id="btn-notifications"
            aria-label="Notifications"
            aria-expanded={isNotifOpen}
            onClick={() => {
              setIsNotifOpen((prev) => !prev);
              setIsProfileOpen(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
          </button>

          {isNotifOpen && (
            <div
              role="dialog"
              aria-label="Notifications panel"
              className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-border bg-card p-4 shadow-xl"
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notificaciones
              </p>
              <p className="mt-3 text-center text-sm text-muted-foreground">
                No hay notificaciones nuevas
              </p>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            id="btn-profile"
            aria-label="Your profile"
            aria-expanded={isProfileOpen}
            onClick={() => {
              setIsProfileOpen((prev) => !prev);
              setIsNotifOpen(false);
            }}
            className="block"
          >
            <img
              src="/professional-avatar.png"
              alt="Your profile"
              className="h-9 w-9 rounded-full border border-border object-cover hover:ring-2 hover:ring-primary transition-all"
            />
          </button>

          {isProfileOpen && (
            <div
              role="menu"
              aria-label="Profile menu"
              className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-border bg-card p-1.5 shadow-xl"
            >
              <button
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                Mi Perfil
              </button>
              <button
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-400 hover:bg-secondary transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
