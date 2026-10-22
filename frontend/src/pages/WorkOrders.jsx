import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter, Plus, Inbox, Search, X, CheckCircle2, Cpu } from "lucide-react";
import TaskCard from "../components/ui/TaskCard";
import NewWorkOrderModal from "../components/ui/NewWorkOrderModal";
import WorkOrderDetailDrawer from "../components/ui/WorkOrderDetailDrawer";
import HardwareInventoryModal from "../components/ui/HardwareInventoryModal";
import { SERVICE_TYPES, PRIORITIES } from "../lib/workOrderOptions";
import { useWorkOrders } from "../context/WorkOrderContext";

// Opciones de filtro por Estado (OrderStatusEnum oficial + columnas Kanban)
const STATUS_FILTERS = [
  { id: "CONFIRMADA", label: "Confirmada / Asignada", columnId: "asignada" },
  { id: "IDLE", label: "Pendiente (Sin asignar)", columnId: "asignada" },
  { id: "EN_RUTA", label: "En Ruta", columnId: "en-transito" },
  { id: "EN_SITIO", label: "En Sitio", columnId: "en-transito" },
  { id: "COMPLETADA", label: "Completada", columnId: "completada" },
];

// Quita tildes y pasa a minúsculas para una búsqueda tolerante
const normalize = (s) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// ---------------------------------------------------------------------------
// Skeleton — réplica fiel de la forma de una TaskCard
// ---------------------------------------------------------------------------
function KanbanCardSkeleton() {
  return (
    <div className="bg-slate-200 dark:bg-gray-800 animate-pulse rounded-xl p-4 mb-4">
      {/* Fila superior: ID + pill de estado */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-16 rounded bg-slate-200 dark:bg-gray-700" />
        <div className="h-5 w-12 rounded-full bg-slate-200 dark:bg-gray-700" />
      </div>

      {/* Fila media: Título + Ubicación */}
      <div className="mt-3 h-5 w-3/4 rounded bg-slate-200 dark:bg-gray-700" />
      <div className="mt-2 h-4 w-1/2 rounded bg-slate-200 dark:bg-gray-700" />

      {/* Fila inferior: Tag + Avatar */}
      <div className="mt-4 flex items-center justify-between">
        <div className="h-6 w-14 rounded-md bg-slate-200 dark:bg-gray-700" />
        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Columna individual — acepta isLoading y onSelectOrder
// ---------------------------------------------------------------------------
function WorkOrderColumn({
  id,
  label,
  accentColor,
  tasks,
  isLoading,
  auditedOrders,
  onSelectOrder,
}) {
  return (
    <section
      className="flex flex-col rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50/40 dark:bg-gray-900/40 overflow-hidden"
      aria-labelledby={`col-${id}-title`}
    >
      {/* Header — siempre visible */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${accentColor}`} aria-hidden="true" />
          <h2
            id={`col-${id}-title`}
            className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400"
          >
            {label}
          </h2>
        </div>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 px-1.5 text-[11px] font-bold text-slate-500 dark:text-gray-400">
          {isLoading ? "—" : tasks.length}
        </span>
      </header>

      {/* Contenido: skeletons o tarjetas reales */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 scrollbar-kanban">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <KanbanCardSkeleton key={i} />)
          : tasks.map((task) => (
              <TaskCard
                key={task.id}
                orderId={task.orderId}
                order_number={task.order_number}
                title={task.title}
                location={task.location}
                address_override={task.address_override}
                client={task.client}
                priority={task.priority}
                assignee={task.assignee}
                assigneeName={task.assigneeName}
                technician_summary={task.technician_summary}
                tag={task.tag}
                isAudited={Boolean(auditedOrders?.[task.orderId])}
                onClick={() => onSelectOrder?.({ ...task, columnStatus: label })}
              />
            ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------
function KanbanEmptyState({
  message = "No hay órdenes de trabajo activas en este momento.",
}) {
  return (
    <div className="col-span-3 flex flex-col items-center justify-center py-32 gap-4">
      <Inbox className="h-12 w-12 text-slate-400 dark:text-gray-600" aria-hidden="true" />
      <p className="text-slate-500 dark:text-gray-400 text-sm text-center">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pill de filtro (botón tipo píldora seleccionable)
// ---------------------------------------------------------------------------
function FilterPill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 ${
        active
          ? "border-orange-500 bg-orange-500 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800"
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Vista principal Work Orders
// ---------------------------------------------------------------------------
export default function WorkOrders() {
  // ── Estado global compartido y sincronización con FastAPI ───────────────────
  const {
    columns,
    createWorkOrder,
    refreshOrders,
    toast,
    setToast,
    totalOrders,
    auditedOrders,
  } = useWorkOrders();

  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let isMounted = true;
    async function loadKanban() {
      try {
        await refreshOrders();
      } catch {
        // Fallback silencioso a Mock Data en WorkOrderContext
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadKanban();
    return () => {
      isMounted = false;
    };
  }, [refreshOrders]);

  // Cambia a `true` para ver el empty state cuando no hay órdenes
  const isEmpty = false;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("search") || "";
  const [search, setSearch] = useState(queryParam);

  useEffect(() => {
    setSearch(queryParam);
  }, [queryParam]);

  const handleSearchChange = (val) => {
    setSearch(val);
    if (val.trim()) {
      setSearchParams({ search: val.trim() });
    } else {
      setSearchParams({});
    }
  };
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null); // OrderStatusEnum | null
  const [priorityFilter, setPriorityFilter] = useState(null); // OrderPriorityEnum | null
  const [serviceFilter, setServiceFilter] = useState(null); // tag | null

  const activeFilterCount =
    (statusFilter ? 1 : 0) + (priorityFilter ? 1 : 0) + (serviceFilter ? 1 : 0);

  // ── Filtrado: búsqueda (OT, cliente, técnico) + estado + prioridad + servicio
  const filteredColumns = useMemo(() => {
    const q = normalize(search.trim());
    return columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t) => {
        if (statusFilter) {
          const taskStatus = String(t.status || "").toUpperCase();
          const selectedMeta = STATUS_FILTERS.find((s) => s.id === statusFilter);
          if (taskStatus !== statusFilter && selectedMeta?.columnId !== col.id) {
            return false;
          }
          if (taskStatus && taskStatus !== statusFilter) {
            return false;
          }
        }
        if (
          priorityFilter &&
          String(t.priority || "").toUpperCase() !== priorityFilter
        ) {
          return false;
        }
        if (
          serviceFilter &&
          t.tag !== serviceFilter &&
          t.serviceType !== serviceFilter
        ) {
          return false;
        }
        if (!q) return true;
        return [
          t.orderId,
          t.order_number,
          t.title,
          typeof t.client === "object" ? t.client?.business_name : t.client,
          t.assigneeName,
          t.technician_summary?.full_name,
          t.location,
          t.address_override,
        ].some((field) => normalize(field).includes(q));
      }),
    }));
  }, [columns, search, statusFilter, priorityFilter, serviceFilter]);

  const visibleCount = filteredColumns.reduce((acc, col) => acc + col.tasks.length, 0);
  const hasActiveCriteria = Boolean(search.trim()) || activeFilterCount > 0;

  const clearFilters = () => {
    setStatusFilter(null);
    setPriorityFilter(null);
    setServiceFilter(null);
  };

  // ── Crear OT: agrega la orden usando el contexto compartido ───────────────
  const handleCreate = (form, apiCreatedOrder) => {
    createWorkOrder(form, apiCreatedOrder);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* ── Toast de confirmación ── */}
      {toast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-white p-4 shadow-2xl dark:border-emerald-500/40 dark:bg-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-900 dark:text-white">
              {toast.title}
            </p>
            <p className="text-slate-500 dark:text-gray-400">
              {toast.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Cerrar notificación"
          >
            <X className="h-4 w-4" />
          </button>
        </aside>
      )}

      <NewWorkOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
      />

      {/* Drawer lateral de Auditoría de OT */}
      <WorkOrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOpenInventoryModal={() => setIsInventoryOpen(true)}
      />

      {/* Modal de Inventario de Hardware (SIM / Routers) */}
      <HardwareInventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
      />

      {/* Barra superior */}
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Work Orders</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Órdenes activas · {totalOrders} órdenes totales · Haz clic en cualquier tarjeta para auditar
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Búsqueda */}
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-gray-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar OT, cliente o técnico..."
              aria-label="Buscar órdenes de trabajo"
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
            />
          </div>

          {/* Botón Filtros */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-controls="work-order-filters"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
              showFilters || activeFilterCount > 0
                ? "border-orange-500/50 bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400"
                : "border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 text-slate-500 dark:text-gray-400 hover:border-slate-300 dark:hover:border-gray-600 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Botón Inventario SIM / Routers */}
          <button
            type="button"
            onClick={() => setIsInventoryOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] hover:border-orange-500/60 dark:hover:border-orange-500/60 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white transition-colors"
          >
            <Cpu className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
            Inventario SIM / Routers
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white active:scale-95 transition-all duration-150 shadow-sm"
            aria-label="Nueva OT"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Nueva OT
          </button>
        </div>
      </div>

      {/* Panel de filtros rápidos (pills) */}
      {showFilters && (
        <div
          id="work-order-filters"
          className="flex shrink-0 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-[#1e1e1e]"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-28 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
              Estado
            </span>
            {STATUS_FILTERS.map((s) => (
              <FilterPill
                key={s.id}
                label={s.label}
                active={statusFilter === s.id}
                onClick={() => setStatusFilter((cur) => (cur === s.id ? null : s.id))}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-28 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
              Prioridad
            </span>
            {PRIORITIES.map((p) => (
              <FilterPill
                key={p}
                label={p}
                active={priorityFilter === p}
                onClick={() => setPriorityFilter((cur) => (cur === p ? null : p))}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-28 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">
              Tipo de servicio
            </span>
            {SERVICE_TYPES.map((s) => (
              <FilterPill
                key={s}
                label={s}
                active={serviceFilter === s}
                onClick={() => setServiceFilter((cur) => (cur === s ? null : s))}
              />
            ))}
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 self-start text-xs font-medium text-orange-600 hover:underline dark:text-orange-400"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Barra de feedback de filtros activos */}
      {hasActiveCriteria && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg bg-orange-500/10 border border-orange-500/20 px-3.5 py-2 text-xs text-orange-700 dark:text-orange-300">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Filtros activos:</span>
            <span>Mostrando {visibleCount} de {totalOrders} órdenes</span>
            {search.trim() && (
              <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[11px] font-medium">
                Texto: "{search.trim()}"
              </span>
            )}
            {statusFilter && (
              <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[11px] font-medium">
                Estado: {STATUS_FILTERS.find((s) => s.id === statusFilter)?.label || statusFilter}
              </span>
            )}
            {priorityFilter && (
              <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[11px] font-medium">
                Prioridad: {priorityFilter}
              </span>
            )}
            {serviceFilter && (
              <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[11px] font-medium">
                Servicio: {serviceFilter}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSearchParams({});
              clearFilters();
            }}
            className="font-semibold text-orange-600 dark:text-orange-400 hover:underline"
          >
            Limpiar todo
          </button>
        </div>
      )}

      {/* Tablero Kanban */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-3">
        {!isLoading && isEmpty ? (
          /* ── Empty State — abarca las 3 columnas ── */
          <KanbanEmptyState />
        ) : !isLoading && hasActiveCriteria && visibleCount === 0 ? (
          <KanbanEmptyState message="Ninguna orden coincide con la búsqueda o los filtros aplicados." />
        ) : (
          /* ── Columnas con tarjetas reales o skeletons ── */
          filteredColumns.map((col) => (
            <WorkOrderColumn
              key={col.id}
              {...col}
              isLoading={isLoading}
              auditedOrders={auditedOrders}
              onSelectOrder={setSelectedOrder}
            />
          ))
        )}
      </div>
    </div>
  );
}
