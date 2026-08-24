/**
 * TaskCard — Tarjeta individual para el tablero Kanban.
 *
 * Props:
 *  - title    {string}  Título de la tarea
 *  - priority {string}  'Alta' | 'Media' | 'Baja'
 *  - assignee {string}  Iniciales del asignado (opcional, default 'U')
 *  - tag      {string}  Etiqueta de categoría (opcional)
 */

const PRIORITY_STYLES = {
  Alta: {
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    dot: "bg-red-500",
    ring: "ring-red-200 dark:ring-red-800",
  },
  Media: {
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    dot: "bg-yellow-400",
    ring: "ring-yellow-200 dark:ring-yellow-800",
  },
  Baja: {
    badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    dot: "bg-green-500",
    ring: "ring-green-200 dark:ring-green-800",
  },
};

export default function TaskCard({ title, priority = "Baja", assignee = "U", tag }) {
  const styles = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES["Baja"];

  return (
    <article
      className="
        group relative flex flex-col gap-3 rounded-xl
        bg-white dark:bg-[hsl(240_10%_10%)]
        border border-border
        p-4 shadow-sm
        ring-1 ring-transparent
        hover:shadow-md hover:ring-2 hover:border-primary/30
        transition-all duration-200 ease-in-out
        cursor-grab active:cursor-grabbing
      "
      aria-label={`OT: ${title}`}
    >
      {/* Tag de categoría (opcional) */}
      {tag && (
        <span className="self-start rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {tag}
        </span>
      )}

      {/* Título */}
      <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors duration-150">
        {title}
      </h3>

      {/* Footer: avatar + badge de prioridad */}
      <div className="flex items-center justify-between mt-auto pt-1">
        {/* Avatar placeholder */}
        <div
          className={`
            flex h-7 w-7 items-center justify-center
            rounded-full bg-primary/20 text-primary
            text-xs font-bold uppercase
            ring-2 ${styles.ring}
            select-none
          `}
          title={`Tecnico: ${assignee}`}
          aria-label={`Tecnico: ${assignee}`}
        >
          {assignee.charAt(0)}
        </div>

        {/* Badge de prioridad */}
        <span
          className={`
            inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5
            text-[10px] font-bold uppercase tracking-wide
            ${styles.badge}
          `}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} aria-hidden="true" />
          {priority}
        </span>
      </div>
    </article>
  );
}
