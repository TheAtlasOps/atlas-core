import { MapPin, Grip } from "lucide-react";

/**
 * TaskCard — Tarjeta Kanban estilo Jira/Linear.
 *
 * Props:
 *  - orderId  {string}  ID de la orden (ej. "#OT-08491")
 *  - title    {string}  Nombre del servicio
 *  - location {string}  Dirección / descripción de la ubicación
 *  - priority {string}  'Alta' | 'Media' | 'Baja'
 *  - assignee {string}  Iniciales del técnico asignado (default 'U')
 *  - tag      {string}  Etiqueta de categoría (Fibra / SIM / Red / etc.)
 */

// ─── Config de prioridad ──────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  Alta: {
    pill: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30",
    dot: "bg-red-500",
  },
  Media: {
    pill: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
    dot: "bg-amber-400",
  },
  Baja: {
    pill: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
    dot: "bg-emerald-500",
  },
};

// ─── Componente ───────────────────────────────────────────────────────────────
export default function TaskCard({
  orderId = "#OT-00000",
  title,
  location,
  priority = "Baja",
  assignee = "U",
  tag,
}) {
  const p = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG["Baja"];

  return (
    <article
      className="
        group relative flex flex-col gap-3 rounded-xl
        bg-[#1c1d24] border border-gray-800
        p-4
        hover:border-gray-600 hover:bg-[#21222a]
        transition-colors duration-150
        cursor-grab active:cursor-grabbing
        select-none
      "
      aria-label={`OT: ${title}`}
    >
      {/* ── Ícono de arrastre (visible on hover) ── */}
      <Grip
        className="absolute top-3 right-3 w-3.5 h-3.5 text-gray-700 group-hover:text-gray-500 transition-colors"
        aria-hidden="true"
      />

      {/* ── Cabecera: ID + Pill de prioridad ── */}
      <div className="flex items-center justify-between gap-2 pr-5">
        <span className="text-[11px] font-mono text-gray-500">{orderId}</span>
        <span
          className={`
            inline-flex items-center gap-1.5 rounded-full px-2 py-0.5
            text-[10px] font-bold uppercase tracking-wide shrink-0
            ${p.pill}
          `}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} aria-hidden="true" />
          {priority}
        </span>
      </div>

      {/* ── Título ── */}
      <h3 className="text-sm font-semibold leading-snug text-white">
        {title}
      </h3>

      {/* ── Ubicación ── */}
      {location && (
        <div className="flex items-start gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" aria-hidden="true" />
          <span className="text-xs text-gray-400 leading-snug">{location}</span>
        </div>
      )}

      {/* ── Footer: tag + avatar ── */}
      <div className="flex items-center justify-between mt-auto pt-1">
        {/* Etiqueta de categoría */}
        {tag ? (
          <span className="rounded-md bg-gray-800 border border-gray-700 px-2 py-0.5 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
            {tag}
          </span>
        ) : (
          <span />
        )}

        {/* Avatar del técnico */}
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold uppercase ring-1 ring-primary/30"
          title={`Técnico: ${assignee}`}
          aria-label={`Técnico: ${assignee}`}
        >
          {assignee.charAt(0)}
        </div>
      </div>
    </article>
  );
}
