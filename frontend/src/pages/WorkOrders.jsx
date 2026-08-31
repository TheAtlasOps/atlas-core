import { Filter, Plus } from "lucide-react";
import TaskCard from "../components/ui/TaskCard";

// ---------------------------------------------------------------------------
// Mock data — enriquecido con orderId y location
// ---------------------------------------------------------------------------
const COLUMNS = [
  {
    id: "asignada",
    label: "Asignada",
    accentColor: "bg-blue-500",
    tasks: [
      { id: 1, orderId: "#OT-08491", title: "Instalación fibra óptica", location: "Av. Providencia 1234, Providencia", priority: "Alta", assignee: "JR", tag: "Fibra" },
      { id: 2, orderId: "#OT-08492", title: "Cambio de SIM corporativa", location: "Entel HQ, Santiago Centro", priority: "Media", assignee: "LP", tag: "SIM" },
      { id: 3, orderId: "#OT-08493", title: "Revisión antena 4G", location: "Torre Entel, Las Condes", priority: "Alta", assignee: "MK", tag: "Red" },
      { id: 4, orderId: "#OT-08494", title: "Diagnóstico router empresarial", location: "Av. Vitacura 2939, Vitacura", priority: "Baja", assignee: "TC", tag: "Hardware" },
    ],
  },
  {
    id: "en-transito",
    label: "En Tránsito",
    accentColor: "bg-amber-500",
    tasks: [
      { id: 5, orderId: "#OT-08495", title: "Activación Magic Link", location: "Calle Irarrázaval 890, Ñuñoa", priority: "Alta", assignee: "EK", tag: "Magic Link" },
      { id: 6, orderId: "#OT-08496", title: "Revisión señal móvil", location: "Torre Entel, Santiago Centro", priority: "Media", assignee: "EK", tag: "Red" },
      { id: 7, orderId: "#OT-08497", title: "Instalación repetidor WiFi", location: "Municipalidad de Maipú, Maipú", priority: "Alta", assignee: "SA", tag: "Hardware" },
    ],
  },
  {
    id: "completada",
    label: "Completada",
    accentColor: "bg-emerald-500",
    tasks: [
      { id: 8, orderId: "#OT-08498", title: "Alta de línea empresarial", location: "BancoEstado Casa Matriz, Santiago", priority: "Baja", assignee: "EK", tag: "SIM" },
      { id: 9, orderId: "#OT-08499", title: "Reemplazo módem ADSL", location: "Calle Los Aromos 52, Peñalolén", priority: "Media", assignee: "LP", tag: "Hardware" },
      { id: 10, orderId: "#OT-08500", title: "Configuración VPN corporativa", location: "Av. Apoquindo 6100, Las Condes", priority: "Media", assignee: "JR", tag: "Red" },
    ],
  },
];

const TOTAL = COLUMNS.reduce((acc, col) => acc + col.tasks.length, 0);

// ---------------------------------------------------------------------------
// Columna individual
// ---------------------------------------------------------------------------
function WorkOrderColumn({ id, label, accentColor, tasks }) {
  return (
    <section
      className="flex flex-col rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden"
      aria-labelledby={`col-${id}-title`}
    >
      {/* Header de columna */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${accentColor}`} aria-hidden="true" />
          <h2
            id={`col-${id}-title`}
            className="text-xs font-bold uppercase tracking-widest text-gray-400"
          >
            {label}
          </h2>
        </div>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-800 border border-gray-700 px-1.5 text-[11px] font-bold text-gray-500">
          {tasks.length}
        </span>
      </header>

      {/* Lista de tarjetas */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 scrollbar-kanban">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            orderId={task.orderId}
            title={task.title}
            location={task.location}
            priority={task.priority}
            assignee={task.assignee}
            tag={task.tag}
          />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Vista principal Work Orders
// ---------------------------------------------------------------------------
export default function WorkOrders() {
  return (
    <div className="flex h-full flex-col gap-4">
      {/* Barra superior */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Work Orders</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Órdenes activas · {TOTAL} órdenes totales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-colors duration-150"
            aria-label="Filtrar órdenes"
          >
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            Filtrar
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 active:scale-95 transition-all duration-150 shadow-sm"
            aria-label="Nueva OT"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Nueva OT
          </button>
        </div>
      </div>

      {/* Tablero Kanban */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <WorkOrderColumn key={col.id} {...col} />
        ))}
      </div>
    </div>
  );
}
