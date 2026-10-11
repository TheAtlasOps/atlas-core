import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Mail, MapPin, BadgeCheck } from "lucide-react";
import AdminAvatar from "./AdminAvatar";

/**
 * Modal "Mi Perfil" para el personal interno de coordinación y despacho.
 * Se controla con estado local desde el Navbar (sin rutas nuevas).
 * Renderizado vía createPortal en document.body con bloqueo de scroll para evitar
 * que el fondo se desplace detrás del modal.
 */
export default function AdminProfileModal({ isOpen, onClose, profile }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    // Bloquear scroll en body y en el contenedor principal (<main>) mientras el modal esté abierto
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

  const { name, avatarSrc, role, email, zone } = profile;

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
              <dt className="text-xs text-slate-500 dark:text-gray-400">Rol operativo</dt>
              <dd className="mt-1">
                <span className="bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-xs font-bold px-2.5 py-1 rounded-full">
                  {role}
                </span>
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

        <div className="mt-2 flex justify-end">
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
