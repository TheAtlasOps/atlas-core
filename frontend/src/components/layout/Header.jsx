import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, BellOff, User, LogOut, Sparkles } from "lucide-react";
import ThemeToggle from "../ui/ThemeToggle";
import AdminAvatar from "../ui/AdminAvatar";
import AdminProfileModal from "../ui/AdminProfileModal";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../context/AuthContext";
import { useWorkOrders } from "../../context/WorkOrderContext";
import { api } from "../../lib/api";

// Datos por defecto del perfil administrativo (Fallback para Vercel / sin token).
const DEFAULT_ADMIN_PROFILE = {
  name: "Usuario Atlas",
  avatarSrc: "/professional-avatar.png",
  role: "COORDINADOR",
  roleLabel: "Coordinador de Despacho",
  email: "usuario@atlasops.cl",
  zone: "Región Metropolitana / Central",
};

export default function Header() {
  const [globalSearch, setGlobalSearch] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const workOrderCtx = useWorkOrders({ optional: true });
  const notifications = workOrderCtx?.notifications || [];
  const unreadCount = workOrderCtx?.unreadCount || 0;
  const markAsRead = workOrderCtx?.markAsRead;
  const markAllAsRead = workOrderCtx?.markAllAsRead;
  const clearNotifications = workOrderCtx?.clearNotifications;

  const [profile, setProfile] = useState(DEFAULT_ADMIN_PROFILE);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const { isDark } = useTheme();
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    if (authUser) {
      setProfile({
        name: authUser.full_name || authUser.name || DEFAULT_ADMIN_PROFILE.name,
        avatarSrc:
          authUser.technician_profile?.avatar_url || DEFAULT_ADMIN_PROFILE.avatarSrc,
        role: (authUser.role || "COORDINADOR").toUpperCase(),
        roleLabel:
          authUser.role === "ADMIN"
            ? "Administrador General Atlas"
            : authUser.role === "TECNICO"
            ? "Especialista Técnico en Terreno"
            : DEFAULT_ADMIN_PROFILE.roleLabel,
        email: authUser.email || DEFAULT_ADMIN_PROFILE.email,
        zone: DEFAULT_ADMIN_PROFILE.zone,
      });
      return;
    }

    try {
      const token = localStorage.getItem("atlas_token");
      if (!token) {
        setProfile(DEFAULT_ADMIN_PROFILE);
        return;
      }
      const user = await api.auth.me();
      if (user) {
        setProfile({
          name: user.full_name || user.name || DEFAULT_ADMIN_PROFILE.name,
          avatarSrc:
            user.technician_profile?.avatar_url || DEFAULT_ADMIN_PROFILE.avatarSrc,
          role: (user.role || "COORDINADOR").toUpperCase(),
          roleLabel:
            user.role === "ADMIN"
              ? "Administrador General Atlas"
              : user.role === "TECNICO"
              ? "Especialista Técnico en Terreno"
              : DEFAULT_ADMIN_PROFILE.roleLabel,
          email: user.email || DEFAULT_ADMIN_PROFILE.email,
          zone: DEFAULT_ADMIN_PROFILE.zone,
        });
      }
    } catch {
      setProfile(DEFAULT_ADMIN_PROFILE);
    }
  }, [authUser]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const handleGlobalSearchSubmit = (e) => {
    e.preventDefault();
    const query = globalSearch.trim();
    if (!query) return;
    navigate(`/work-orders?search=${encodeURIComponent(query)}`);
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <>
      <header className="flex items-center gap-4 h-16 shrink-0 border-b border-slate-200 bg-white px-4 md:px-6 dark:border-gray-700 dark:bg-[#1e1e1e]">
        <div className="lg:hidden flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <span className="text-primary-foreground font-bold leading-none">
            A
          </span>
        </div>

        {/* Search global funcional */}
        <form onSubmit={handleGlobalSearchSubmit} className="relative flex-1 max-w-xl mx-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Buscar órdenes, técnicos o SIMs..."
            aria-label="Buscar órdenes, técnicos o SIMs en la plataforma"
            className="w-full rounded-md border border-border bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </form>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              id="btn-notifications"
              aria-label="Notifications"
              aria-expanded={isNotifOpen}
              onClick={() => {
                setIsNotifOpen((prev) => !prev);
                setIsMenuOpen(false);
              }}
              className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white shadow-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div
                role="dialog"
                aria-label="Notifications panel"
                className="absolute right-0 top-11 z-50 w-72 sm:w-84 rounded-xl border border-border bg-card p-4 shadow-xl"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-border">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Notificaciones
                    </p>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-orange-500/10 dark:bg-orange-950/40 px-1.5 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                        {unreadCount} nuevas
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllAsRead?.()}
                        className="text-[11px] text-muted-foreground hover:text-foreground font-medium transition cursor-pointer"
                      >
                        Marcar leídas
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={() => clearNotifications?.()}
                        className="text-[11px] text-orange-500 hover:text-orange-600 font-medium transition cursor-pointer"
                      >
                        Limpiar todas
                      </button>
                    )}
                  </div>
                </div>

                {notifications.length === 0 ? (
                  <div className="py-6 flex flex-col items-center justify-center text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-2">
                      <BellOff className="h-5 w-5 opacity-70" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      Sin notificaciones
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      No tienes alertas ni avisos pendientes.
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 divide-y divide-border max-h-72 overflow-y-auto">
                    {notifications.map((n) => {
                      const isSim = Boolean(n.isSimulated || n.type === "simulation");
                      const handleOpenNotification = () => {
                        markAsRead?.(n.id);
                        if (n.orderNumber) {
                          navigate(
                            `/work-orders?order=${encodeURIComponent(
                              n.orderNumber
                            )}&search=${encodeURIComponent(n.orderNumber)}`
                          );
                          setIsNotifOpen(false);
                        }
                      };

                      return (
                        <div
                          key={n.id}
                          role="button"
                          tabIndex={0}
                          onClick={handleOpenNotification}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleOpenNotification();
                            }
                          }}
                          className={`py-2.5 px-2 rounded-lg text-xs transition-colors cursor-pointer flex items-start gap-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                            n.read
                              ? "opacity-75 hover:bg-slate-50 dark:hover:bg-gray-800/50"
                              : "bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                          }`}
                        >
                          <div className="mt-1 shrink-0">
                            {isSim ? (
                              <span className="flex h-2 w-2 rounded-full bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-900" />
                            ) : n.type === "urgent" ? (
                              <span className="flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-rose-300 dark:ring-rose-900" />
                            ) : n.type === "tracking" ? (
                              <span className="flex h-2 w-2 rounded-full bg-orange-500 ring-2 ring-orange-300 dark:ring-orange-900" />
                            ) : !n.read ? (
                              <span className="flex h-2 w-2 rounded-full bg-orange-500" />
                            ) : (
                              <span className="flex h-2 w-2 rounded-full bg-slate-300 dark:bg-gray-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p
                                  className={`font-semibold truncate ${
                                    n.read
                                      ? "text-foreground"
                                      : "text-orange-600 dark:text-orange-400 font-bold"
                                  }`}
                                >
                                  {n.title}
                                </p>
                                {isSim && (
                                  <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/50 dark:border-amber-800/50 shrink-0">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    Simulación
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {n.time}
                              </span>
                            </div>
                            <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed line-clamp-2">
                              {n.message}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              id="btn-profile"
              aria-label="Your profile"
              aria-expanded={isMenuOpen}
              onClick={() => {
                setIsMenuOpen((prev) => !prev);
                setIsNotifOpen(false);
              }}
              className="block rounded-full hover:ring-2 hover:ring-orange-500 transition-all"
            >
              <AdminAvatar src={profile.avatarSrc} name={profile.name} />
            </button>

            {isMenuOpen && (
              <div
                role="menu"
                aria-label="Profile menu"
                className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-[#1e1e1e]"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsProfileOpen(true);
                  }}
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
                  onClick={handleLogout}
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

      <AdminProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        onProfileChange={setProfile}
        defaultProfile={DEFAULT_ADMIN_PROFILE}
      />
    </>
  );
}
