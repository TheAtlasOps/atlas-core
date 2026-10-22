import { MapPin, Grip, ShieldCheck } from "lucide-react";
import AdminAvatar from "./AdminAvatar";

/**
 * TaskCard — Tarjeta Kanban estilo Jira/Linear.
 *
 * Props:
 *  - orderId      {string}   ID de la orden (ej. "#OT-08491")
 *  - title        {string}   Nombre del servicio
 *  - location     {string}   Dirección / descripción de la ubicación
 *  - priority     {string}   'Alta' | 'Media' | 'Baja'
 *  - assigneeName {string}   Nombre completo del técnico asignado (ej. "Juan Rivas")
 *  - assignee     {string}   Fallback si no hay `assigneeName` (default 'U')
 *  - tag          {string}   Etiqueta de categoría (Fibra / SIM / Red / etc.)
 *  - isAudited    {boolean}  Indica si la auditoría de la OT fue aprobada
 *  - onClick      {Function} Acción al hacer clic en la tarjeta (abre el Drawer de Auditoría)
 */

// ─── Config de prioridad (soporta OrderPriorityEnum y etiquetas legibles) ───
const PRIORITY_CONFIG = {
  URGENTE: {
    pill: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
  },
  Urgente: {
    pill: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
  },
  ALTA: {
    pill: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  },
  Alta: {
    pill: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  },
  MEDIA: {
    pill: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400",
  },
  Media: {
    pill: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400",
  },
  BAJA: {
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  },
  Baja: {
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  },
};

// ─── Componente ───────────────────────────────────────────────────────────────
export default function TaskCard({
  orderId,
  order_number,
  title,
  location,
  address_override,
  client,
  priority = "BAJA",
  assignee = "U",
  assigneeName,
  technician_summary,
  tag,
  isAudited = false,
  onClick,
}) {
  const resolvedOrderId = orderId || order_number || "#OT-00000";
  const resolvedLocation = location || address_override || "";
  const resolvedClient =
    typeof client === "object" ? client?.business_name : client;
  const p =
    PRIORITY_CONFIG[priority] ??
    PRIORITY_CONFIG[String(priority).toUpperCase()] ??
    PRIORITY_CONFIG.BAJA;
  const technicianName =
    assigneeName || technician_summary?.full_name || assignee;

  const handleKeyDown = (e) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <article
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="
        group relative flex flex-col gap-3 rounded-xl
        bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-gray-800
        p-4
        hover:border-orange-500/60 dark:hover:border-orange-500/60 hover:bg-slate-50 dark:hover:bg-[#262626]
        transition-all duration-150
        cursor-pointer
        select-none
        focus:outline-none focus:ring-2 focus:ring-orange-500
      "
      aria-label={`Auditar OT ${resolvedOrderId}: ${title}`}
    >
      {/* ── Cabecera: ícono de arrastre + ID | Badge de prioridad (arriba derecha) ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Grip
            className="w-3.5 h-3.5 shrink-0 text-slate-300 dark:text-gray-700 group-hover:text-orange-500 transition-colors"
            aria-hidden="true"
          />
          <span className="text-[11px] font-mono text-slate-500 dark:text-gray-400 truncate">
            {resolvedOrderId}
          </span>
          {isAudited && (
            <span
              title="Auditoría técnica verificada"
              className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
            >
              <ShieldCheck className="h-3 w-3" />
              Auditada
            </span>
          )}
        </div>
        <span
          className={`
            inline-flex items-center rounded-full px-2.5 py-0.5
            text-xs font-semibold uppercase tracking-wide shrink-0
            ${p.pill}
          `}
        >
          {priority}
        </span>
      </div>

      {/* ── Título y Cliente ── */}
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold leading-snug text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
          {title}
        </h3>
        {resolvedClient && (
          <p className="text-xs font-medium text-slate-500 dark:text-gray-400 truncate">
            {resolvedClient}
          </p>
        )}
      </div>

      {/* ── Ubicación ── */}
      {resolvedLocation && (
        <div className="flex items-start gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400 mt-0.5 shrink-0" aria-hidden="true" />
          <span className="text-xs text-slate-500 dark:text-gray-400 leading-snug">{resolvedLocation}</span>
        </div>
      )}

      {/* ── Footer: tag | avatar + nombre del técnico ── */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-1">
        {/* Etiqueta de categoría */}
        <div className="flex items-center gap-1.5">
          {tag ? (
            <span className="shrink-0 rounded-md bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">
              {tag}
            </span>
          ) : null}
          <span className="text-xs font-semibold text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
            Ver auditoría →
          </span>
        </div>

        {/* Técnico: avatar pequeño con iniciales + nombre */}
        <div className="flex items-center gap-2 min-w-0" title={`Técnico: ${technicianName}`}>
          <span className="truncate text-xs font-medium text-slate-600 dark:text-gray-300">
            {technicianName}
          </span>
          <AdminAvatar name={technicianName} className="w-6 h-6 text-[10px]" />
        </div>
      </div>

    </article>
  );
}
