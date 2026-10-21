import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Mail, MapPin, BadgeCheck, KeyRound, CheckCircle2 } from "lucide-react";
import AdminAvatar from "./AdminAvatar";
import { api } from "../../lib/api";

const DEFAULT_FALLBACK = {
  name: "Diego Jiménez Escobar",
  avatarSrc: "/professional-avatar.png",
  role: "COORDINADOR",
  roleLabel: "Coordinador de Despacho & Scrum Master",
  email: "d.jimenez@entel.cl",
  zone: "Región Metropolitana / Central",
};

/**
 * Modal "Mi Perfil" para el personal interno de coordinación y despacho.
 * Al abrirse, consulta `api.auth.me()` para poblar Nombre, Correo y Rol RBAC
 * (`COORDINADOR`, `ADMIN`, `TECNICO`), y ofrece inicio de sesión contra
 * `api.auth.login(email, password)` guardando `atlas_token` en localStorage.
 * Si falla o no hay token, muestra por defecto los datos de Diego Jiménez Escobar.
 */
export default function AdminProfileModal({
  isOpen,
  onClose,
  profile,
  onProfileChange,
  defaultProfile = DEFAULT_FALLBACK,
}) {
  const [liveProfile, setLiveProfile] = useState(profile || defaultProfile);
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("d.jimenez@entel.cl");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginStatus, setLoginStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setLiveProfile(profile);
    }
  }, [profile]);

  // Consultar api.auth.me() al abrir el modal con fallback a Diego Jiménez Escobar
  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;
    async function syncMe() {
      try {
        const user = await api.auth.me();
        if (!cancelled && user) {
          const updated = {
            name: user.full_name || user.name || defaultProfile.name,
            avatarSrc:
              user.technician_profile?.avatar_url || defaultProfile.avatarSrc,
            role: (user.role || "COORDINADOR").toUpperCase(),
            roleLabel:
              user.role === "ADMIN"
                ? "Administrador General Atlas"
                : user.role === "TECNICO"
                ? "Especialista Técnico en Terreno"
                : defaultProfile.roleLabel,
            email: user.email || defaultProfile.email,
            zone: defaultProfile.zone,
          };
          setLiveProfile(updated);
          onProfileChange?.(updated);
        }
      } catch {
        // Fallback a Diego Jiménez Escobar cuando no hay backend o token
        if (!cancelled) {
          setLiveProfile(profile || defaultProfile);
        }
      }
    }

    syncMe();
    return () => {
      cancelled = true;
    };
  }, [isOpen, defaultProfile, onProfileChange, profile]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const prevBodyOverflow = document.body.style.overflow;
    const mainEl = document.querySelector("main");
    const prevMainOverflow = mainEl ? mainEl.style.overflow : "";

    document.body.style.overflow = "hidden";
    if (mainEl) {
      mainEl.style.overflow = "hidden";
    }

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      if (mainEl) {
        mainEl.style.overflow = prevMainOverflow;
      }
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const {
    name = defaultProfile.name,
    avatarSrc = defaultProfile.avatarSrc,
    role = "COORDINADOR",
    roleLabel = defaultProfile.roleLabel,
    email = defaultProfile.email,
    zone = defaultProfile.zone,
  } = liveProfile || defaultProfile;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginStatus(null);
    try {
      const res = await api.auth.login(loginEmail, loginPassword);
      if (res?.access_token) {
        localStorage.setItem("atlas_token", res.access_token);
      }
      const meData = await api.auth.me().catch(() => res);
      const updated = {
        name: meData?.full_name || res?.full_name || defaultProfile.name,
        avatarSrc: defaultProfile.avatarSrc,
        role: (meData?.role || res?.role || "COORDINADOR").toUpperCase(),
        roleLabel: defaultProfile.roleLabel,
        email: meData?.email || res?.email || loginEmail,
        zone: defaultProfile.zone,
      };
      setLiveProfile(updated);
      onProfileChange?.(updated);
      setLoginStatus("Sesión JWT iniciada y sincronizada con FastAPI.");
      setShowLogin(false);
      setLoginPassword("");
    } catch {
      // Fallback en modo demo/Vercel
      setLoginStatus("Modo Demo activo (Fallback local: Diego Jiménez Escobar).");
      setShowLogin(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-profile-title"
        onClick={(e) => e.stopPropagation()}
        className="relative my-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-[#1e1e1e]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-4 pr-8">
          <AdminAvatar src={avatarSrc} name={name} className="w-16 h-16 text-xl" />
          <div className="min-w-0">
            <h2
              id="admin-profile-title"
              className="truncate text-lg font-semibold text-slate-900 dark:text-white"
            >
              {name}
            </h2>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Activo en turno
            </span>
          </div>
        </div>

        {/* Datos operativos */}
        <dl className="mt-6 divide-y divide-slate-200 dark:divide-gray-700 border-t border-slate-200 dark:border-gray-700">
          <div className="flex items-start gap-3 py-3">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-gray-400" />
            <div>
              <dt className="text-xs text-slate-500 dark:text-gray-400">Rol operativo RBAC</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                <span className="bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-xs font-bold px-2.5 py-1 rounded-full font-mono">
                  {role}
                </span>
                {roleLabel && roleLabel !== role && (
                  <span className="text-xs text-slate-600 dark:text-gray-300">
                    {roleLabel}
                  </span>
                )}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3 py-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-gray-400" />
            <div className="min-w-0">
              <dt className="text-xs text-slate-500 dark:text-gray-400">Correo corporativo</dt>
              <dd className="truncate text-sm text-slate-900 dark:text-white">{email}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3 py-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-gray-400" />
            <div>
              <dt className="text-xs text-slate-500 dark:text-gray-400">Zona operativa asignada</dt>
              <dd className="text-sm text-slate-900 dark:text-white">{zone}</dd>
            </div>
          </div>
        </dl>

        {loginStatus && (
          <div className="mt-2 mb-2 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{loginStatus}</span>
          </div>
        )}

        {/* Formulario colapsable de conexión JWT con api.auth.login */}
        {showLogin && (
          <form
            onSubmit={handleLoginSubmit}
            className="mt-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-[#141414] p-3.5 space-y-3"
          >
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              Sincronizar Token JWT (FastAPI Auth)
            </p>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-gray-400">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-gray-400">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogin(false)}
                className="rounded-lg border border-slate-200 dark:border-gray-700 px-3 py-1.5 text-xs text-slate-600 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-orange-500 hover:bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                {isSubmitting ? "Autenticando..." : "Iniciar Sesión JWT"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowLogin((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline"
          >
            <KeyRound className="h-3.5 w-3.5" />
            {showLogin ? "Ocultar acceso JWT" : "Conectar sesión JWT"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
