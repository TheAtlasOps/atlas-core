import { useState } from "react";
import { Search, Bell, User, LogOut } from "lucide-react";
import ThemeToggle from "../ui/ThemeToggle";
import { useTheme } from "../../hooks/useTheme";

export default function Header() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { isDark } = useTheme();

  return (
    <header className="flex items-center gap-4 h-16 shrink-0 border-b border-slate-200 bg-white px-4 md:px-6 dark:border-gray-700 dark:bg-[#1e1e1e]">
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
              className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-[#1e1e1e]"
            >
              <button
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-900 hover:bg-slate-100 transition-colors dark:text-white dark:hover:bg-gray-800"
              >
                <User className="h-4 w-4 text-slate-500 dark:text-gray-400" />
                Mi Perfil
              </button>

              {/* Switch de tema: Modo Claro / Modo Oscuro */}
              <div
                role="menuitem"
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors dark:hover:bg-gray-800"
              >
                <label
                  htmlFor="theme-toggle-menu"
                  className="flex-1 cursor-pointer select-none text-sm text-slate-900 dark:text-white"
                >
                  {isDark ? "Modo oscuro" : "Modo claro"}
                </label>
                <ThemeToggle id="theme-toggle-menu" />
              </div>

              <button
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-slate-100 transition-colors dark:text-rose-400 dark:hover:bg-gray-800"
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
