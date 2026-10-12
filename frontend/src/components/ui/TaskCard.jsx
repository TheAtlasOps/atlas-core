import { MapPin, Grip } from "lucide-react";
import AdminAvatar from "./AdminAvatar";

/**
 * TaskCard — Tarjeta Kanban estilo Jira/Linear.
 *
 * Props:
 *  - orderId      {string}  ID de la orden (ej. "#OT-08491")
 *  - title        {string}  Nombre del servicio
 *  - location     {string}  Dirección / descripción de la ubicación
 *  - priority     {string}  'Alta' | 'Media' | 'Baja'
 *  - assigneeName {string}  Nombre completo del técnico asignado (ej. "Juan Rivas")
 *  - assignee     {string}  Fallback si no hay `assigneeName` (default 'U')
 *  - tag          {string}  Etiqueta de categoría (Fibra / SIM / Red / etc.)
 */

// ─── Config de prioridad ──────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  Alta: {
    pill: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  },
  Media: {
    pill: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400",
  },
  Baja: {
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  },
};

// ─── Componente ───────────────────────────────────────────────────────────────
export default function TaskCard({
  orderId = "#OT-00000",
  title,
  location,
  priority = "Baja",
  assignee = "U",
  assigneeName,
  tag,
}) {
  const p = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG["Baja"];
  const technicianName = assigneeName ?? assignee;

  return (
    <article
      className="
        group relative flex flex-col gap-3 rounded-xl
        bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-gray-700
        p-4
        hover:border-slate-300 dark:hover:border-gray-600 hover:bg-slate-50 dark:hover:bg-[#262626]
        transition-colors duration-150
        cursor-grab active:cursor-grabbing
        select-none
      "
      aria-label={`OT: ${title}`}
    >
      {/* ── Cabecera: ícono de arrastre + ID | Badge de prioridad (arriba derecha) ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Grip
            className="w-3.5 h-3.5 shrink-0 text-slate-300 dark:text-gray-700 group-hover:text-slate-500 dark:group-hover:text-gray-400 transition-colors"
            aria-hidden="true"
          />
          <span className="text-[11px] font-mono text-slate-500 dark:text-gray-400 truncate">
            {orderId}
          </span>
        </div>
        <span
          className={`
            inline-flex items-center rounded-full px-2.5 py-0.5
            text-[10px] font-bold uppercase tracking-wide shrink-0
            ${p.pill}
          `}
        >
          {priority}
        </span>
      </div>

      {/* ── Título ── */}
      <h3 className="text-sm font-semibold leading-snug text-slate-900 dark:text-white">
        {title}
      </h3>

      {/* ── Ubicación ── */}
      {location && (
        <div className="flex items-start gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400 mt-0.5 shrink-0" aria-hidden="true" />
          <span className="text-xs text-slate-500 dark:text-gray-400 leading-snug">{location}</span>
        </div>
      )}

      {/* ── Footer: tag | avatar + nombre del técnico ── */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-1">
        {/* Etiqueta de categoría */}
        {tag ? (
          <span className="shrink-0 rounded-md bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">
            {tag}
          </span>
        ) : (
          <span />
        )}

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
