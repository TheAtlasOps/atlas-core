import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, BellOff, CheckCheck, User, LogOut } from "lucide-react";
import ThemeToggle from "../ui/ThemeToggle";
import AdminAvatar from "../ui/AdminAvatar";
import AdminProfileModal from "../ui/AdminProfileModal";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../context/AuthContext";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
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
          <div className="relative" ref={notifRef}>
            <button
              id="btn-notifications"
              aria-label="Notifications"
              aria-expanded={isNotifOpen}
              onClick={() => {
                setIsNotifOpen((prev) => {
                  const next = !prev;
                  if (next) setUnreadCount(0);
                  return next;
                });
                setIsMenuOpen(false);
              }}
              className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-[#1e1e1e]" />
              )}
            </button>

            {isNotifOpen && (
              <div
                role="dialog"
                aria-label="Notifications panel"
                className="absolute right-0 top-11 z-50 w-72 sm:w-80 rounded-xl border border-border bg-card p-4 shadow-xl"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Notificaciones
                  </p>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => {
                        setNotifications([]);
                        setUnreadCount(0);
                      }}
                      className="text-[11px] text-orange-500 hover:text-orange-600 font-medium transition"
                    >
                      Limpiar todas
                    </button>
                  )}
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
                  <div className="mt-2 divide-y divide-border max-h-60 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="py-2.5 text-xs">
                        <p className="font-semibold text-foreground">{n.title}</p>
                        <p className="text-muted-foreground mt-0.5">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                      </div>
                    ))}
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
