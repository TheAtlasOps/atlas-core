import TaskCard from "../components/ui/TaskCard";

// ---------------------------------------------------------------------------
// Datos de ejemplo (hardcoded) para validar el layout visual
// ---------------------------------------------------------------------------
const COLUMNS = [
  {
    id: "todo",
    label: "To Do",
    count: 4,
    accentColor: "bg-blue-500",
    headerColor:
      "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/40",
    tasks: [
      { id: 1, title: "Definir arquitectura del módulo de autenticación", priority: "Alta", assignee: "JR", tag: "Auth" },
      { id: 2, title: "Revisar wireframes de la vista de reportes", priority: "Media", assignee: "LP", tag: "Diseño" },
      { id: 3, title: "Configurar pipeline de CI/CD en GitHub Actions", priority: "Alta", assignee: "MK" },
      { id: 4, title: "Documentar endpoints de la API REST", priority: "Baja", assignee: "TC", tag: "Docs" },
    ],
  },
  {
    id: "inprogress",
    label: "In Progress",
    count: 3,
    accentColor: "bg-amber-500",
    headerColor:
      "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40",
    tasks: [
      { id: 5, title: "Implementar componente TaskCard con Tailwind CSS", priority: "Alta", assignee: "EK", tag: "Frontend" },
      { id: 6, title: "Integrar Zustand para estado global del tablero", priority: "Media", assignee: "EK", tag: "Frontend" },
      { id: 7, title: "Migrar base de datos a esquema v2", priority: "Alta", assignee: "SA", tag: "Backend" },
    ],
  },
  {
    id: "done",
    label: "Done",
    count: 3,
    accentColor: "bg-emerald-500",
    headerColor:
      "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40",
    tasks: [
      { id: 8, title: "Configurar proyecto con Vite + React + Tailwind", priority: "Baja", assignee: "EK", tag: "Setup" },
      { id: 9, title: "Diseñar layout del Sidebar y Header", priority: "Media", assignee: "LP", tag: "Diseño" },
      { id: 10, title: "Crear página de Dashboard con métricas base", priority: "Media", assignee: "JR", tag: "Frontend" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Componente columna individual
// ---------------------------------------------------------------------------
function KanbanColumn({ id, label, count, accentColor, headerColor, tasks }) {
  return (
    <section
      className="flex flex-col rounded-2xl border border-border bg-muted/40 dark:bg-muted/20 overflow-hidden"
      aria-labelledby={`col-${id}-title`}
    >
      {/* Cabecera de columna */}
      <header
        className={`flex items-center justify-between px-4 py-3 border-b ${headerColor}`}
      >
        <div className="flex items-center gap-2">
          {/* Indicador de color de columna */}
          <span className={`h-2.5 w-2.5 rounded-full ${accentColor}`} aria-hidden="true" />
          <h2
            id={`col-${id}-title`}
            className="text-sm font-bold uppercase tracking-widest text-foreground/80"
          >
            {label}
          </h2>
        </div>
        {/* Contador de tareas */}
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground/10 px-1.5 text-[11px] font-bold text-foreground/60">
          {count}
        </span>
      </header>

      {/* Lista de tarjetas con scroll interno */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent min-h-0">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            title={task.title}
            priority={task.priority}
            assignee={task.assignee}
            tag={task.tag}
          />
        ))}

        {/* Botón "Agregar tarea" */}
        <button
          type="button"
          className="
            w-full mt-1 flex items-center justify-center gap-1.5
            rounded-xl border border-dashed border-border
            py-2.5 text-xs font-medium text-muted-foreground
            hover:border-primary/50 hover:text-primary hover:bg-primary/5
            transition-all duration-150
          "
          aria-label={`Agregar tarea a ${label}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Agregar tarea
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Vista principal Kanban
// ---------------------------------------------------------------------------
export default function Kanban() {
  return (
    <div className="flex h-full flex-col gap-4">
      {/* Encabezado de la vista */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tablero Kanban</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sprint actual · {COLUMNS.reduce((acc, col) => acc + col.count, 0)} tareas totales
          </p>
        </div>

        {/* Acciones de cabecera */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="
              hidden sm:inline-flex items-center gap-1.5
              rounded-lg border border-border bg-background
              px-3 py-1.5 text-xs font-medium text-foreground
              hover:bg-muted hover:border-primary/30
              transition-all duration-150
            "
            aria-label="Filtrar tareas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L13 10.414V17a1 1 0 01-1.447.894l-4-2A1 1 0 017 15v-4.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            Filtrar
          </button>
          <button
            type="button"
            className="
              inline-flex items-center gap-1.5
              rounded-lg bg-primary
              px-3 py-1.5 text-xs font-semibold text-primary-foreground
              hover:opacity-90 active:scale-95
              transition-all duration-150 shadow-sm
            "
            aria-label="Nueva tarea"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Nueva tarea
          </button>
        </div>
      </div>

      {/* Grid de columnas */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <KanbanColumn key={col.id} {...col} />
        ))}
      </div>
    </div>
  );
}
