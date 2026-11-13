import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  User,
  ClipboardList,
  Edit2,
  RefreshCw,
  CheckCircle2,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useWorkOrders } from "../context/WorkOrderContext";
import ClientModal from "../components/ui/ClientModal";
import ClientDetailDrawer from "../components/ui/ClientDetailDrawer";
import NewWorkOrderModal from "../components/ui/NewWorkOrderModal";

// ---------------------------------------------------------------------------
// Skeleton card para carga
// ---------------------------------------------------------------------------
function ClientCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] p-5 animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-5 w-40 bg-slate-200 dark:bg-gray-700 rounded" />
        <div className="h-5 w-16 bg-slate-200 dark:bg-gray-700 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-32 bg-slate-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-48 bg-slate-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-40 bg-slate-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="pt-3 border-t border-slate-200 dark:border-gray-800 flex justify-between">
        <div className="h-8 w-24 bg-slate-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-8 w-24 bg-slate-200 dark:bg-gray-700 rounded-lg" />
      </div>
    </div>
  );
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("ALL"); // ALL, ACTIVE_ORDERS, NO_ACTIVE_ORDERS
  const [toast, setToast] = useState(null);

  // Modales y drawers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState(null);
  const [selectedClientForDrawer, setSelectedClientForDrawer] = useState(null);
  const [orderModalClient, setOrderModalClient] = useState(null);

  const { user } = useAuth();
  const { createWorkOrder } = useWorkOrders();

  const userRole = (user?.role || "COORDINADOR").toUpperCase();
  const canManage = userRole === "ADMIN" || userRole === "COORDINADOR";

  const showToast = useCallback((title, description, type = "success") => {
    setToast({ title, description, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.clients.getAll();
      if (Array.isArray(data)) {
        setClients(data);
      }
    } catch (err) {
      console.error("Error al cargar clientes:", err);
      showToast(
        "Error al sincronizar clientes",
        err?.message || "No se pudo obtener el listado de clientes desde Neon.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Manejo de guardado (creación / edición)
  const handleClientSaved = (savedClient) => {
    setClients((prev) => {
      const exists = prev.some((c) => c.id === savedClient.id);
      if (exists) {
        return prev.map((c) => (c.id === savedClient.id ? { ...c, ...savedClient } : c));
      }
      return [savedClient, ...prev];
    });

    if (selectedClientForDrawer?.id === savedClient.id) {
      setSelectedClientForDrawer((prev) => ({ ...prev, ...savedClient }));
    }

    showToast(
      clientToEdit ? "Cliente actualizado" : "Cliente registrado",
      `Los datos de «${savedClient.business_name}» se guardaron exitosamente en Neon.`
    );
  };

  // KPIs
  const totalClients = clients.length;
  const clientsWithActiveOrders = useMemo(
    () => clients.filter((c) => (c.active_orders_count || 0) > 0).length,
    [clients]
  );
  const uniqueComunasCount = useMemo(() => {
    const set = new Set(clients.map((c) => c.comuna).filter(Boolean));
    return set.size;
  }, [clients]);
  const totalLinkedOrders = useMemo(
    () => clients.reduce((acc, c) => acc + (c.total_orders_count || 0), 0),
    [clients]
  );

  // Filtrado reactivo
  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return clients.filter((c) => {
      const matchesSearch =
        !q ||
        c.business_name?.toLowerCase().includes(q) ||
        c.rut?.toLowerCase().includes(q) ||
        c.contact_person?.toLowerCase().includes(q) ||
        c.contact_email?.toLowerCase().includes(q) ||
        c.contact_phone?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q) ||
        c.comuna?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterMode === "ACTIVE_ORDERS") {
        return (c.active_orders_count || 0) > 0;
      }
      if (filterMode === "NO_ACTIVE_ORDERS") {
        return (c.active_orders_count || 0) === 0;
      }
      return true;
    });
  }, [clients, searchQuery, filterMode]);

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Toast informativo */}
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
            className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Cerrar notificación"
          >
            <X className="h-4 w-4" />
          </button>
        </aside>
      )}

      {/* Cabecera de la sección */}
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Clientes</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Directorio corporativo y residencial de clientes integrados con órdenes de trabajo y Magic Links.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadClients}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50"
            title="Recargar clientes desde Neon"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Sincronizar
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => {
                setClientToEdit(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-orange-600 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Nuevo cliente
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4 shrink-0">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Clientes
          </p>
          <p className="mt-1.5 text-2xl font-bold text-foreground">
            {isLoading ? "—" : totalClients}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Registrados en Neon</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Con OTs Activas
          </p>
          <p className="mt-1.5 text-2xl font-bold text-orange-600 dark:text-orange-400">
            {isLoading ? "—" : clientsWithActiveOrders}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">En atención técnica</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Cobertura Comunal
          </p>
          <p className="mt-1.5 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {isLoading ? "—" : uniqueComunasCount}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Comunas en RM</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Órdenes Vinculadas
          </p>
          <p className="mt-1.5 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {isLoading ? "—" : totalLinkedOrders}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Historial técnico acumulado</p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por empresa, contacto, RUT, correo o comuna..."
            aria-label="Buscar clientes"
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterMode("ALL")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              filterMode === "ALL"
                ? "bg-orange-500 text-white font-bold"
                : "border border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            Todos ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("ACTIVE_ORDERS")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              filterMode === "ACTIVE_ORDERS"
                ? "bg-orange-500 text-white font-bold"
                : "border border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            Con OTs Activas ({clientsWithActiveOrders})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("NO_ACTIVE_ORDERS")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              filterMode === "NO_ACTIVE_ORDERS"
                ? "bg-orange-500 text-white font-bold"
                : "border border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            Sin OTs Activas ({clients.length - clientsWithActiveOrders})
          </button>
        </div>
      </div>

      {/* Grid de Clientes */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ClientCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border bg-card p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-3">
              <Building2 className="h-6 w-6 opacity-60" />
            </div>
            <h3 className="text-sm font-bold text-foreground">
              No se encontraron clientes
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {searchQuery
                ? `No hay coincidencias para «${searchQuery}». Intente con otro término o limpie el filtro.`
                : "Aún no hay clientes registrados en la plataforma."}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors cursor-pointer"
              >
                Limpiar búsqueda
              </button>
            ) : canManage ? (
              <button
                type="button"
                onClick={() => {
                  setClientToEdit(null);
                  setIsModalOpen(true);
                }}
                className="mt-3.5 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-orange-600 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Registrar primer cliente
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-6">
            {filteredClients.map((clientItem) => {
              const activeCount = clientItem.active_orders_count || 0;
              const totalCount = clientItem.total_orders_count || 0;

              return (
                <div
                  key={clientItem.id}
                  className="rounded-2xl border border-border bg-card p-5 hover:border-orange-500/50 hover:shadow-lg transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-foreground group-hover:text-orange-500 transition-colors truncate">
                          {clientItem.business_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {clientItem.rut ? (
                            <span className="font-mono text-[11px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                              {clientItem.rut}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Corporativo</span>
                          )}
                          <span className="text-[11px] text-muted-foreground truncate">
                            · {clientItem.comuna}
                          </span>
                        </div>
                      </div>

                      {activeCount > 0 ? (
                        <span className="rounded-full bg-orange-500/10 dark:bg-orange-950/40 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400 border border-orange-500/20 shrink-0">
                          {activeCount} activa{activeCount === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-gray-400 shrink-0">
                          Al día
                        </span>
                      )}
                    </div>

                    {/* Información de contacto */}
                    <div className="mt-4 space-y-2 text-xs text-muted-foreground border-t border-border/60 pt-3">
                      {clientItem.contact_person && (
                        <div className="flex items-center gap-2 truncate">
                          <User className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                          <span className="truncate">{clientItem.contact_person}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                        <span className="truncate">{clientItem.contact_email}</span>
                      </div>

                      <div className="flex items-center gap-2 truncate font-mono">
                        <Phone className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                        <span>{clientItem.contact_phone}</span>
                      </div>

                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                        <span className="truncate">{clientItem.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedClientForDrawer(clientItem)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-border bg-secondary text-xs font-semibold text-foreground hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      <ClipboardList className="h-3.5 w-3.5 text-orange-500" />
                      Ficha ({totalCount})
                    </button>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientToEdit(clientItem);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Editar datos de cliente"
                        aria-label={`Editar ${clientItem.business_name}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setOrderModalClient(clientItem)}
                      className="inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg bg-orange-500 text-xs font-semibold text-white hover:bg-orange-600 transition-colors cursor-pointer shrink-0"
                      title="Crear nueva orden de trabajo para este cliente"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nueva OT
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Cliente */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setClientToEdit(null);
        }}
        initialClient={clientToEdit}
        onSuccess={handleClientSaved}
      />

      {/* Drawer Ficha Técnica de Cliente */}
      <ClientDetailDrawer
        client={selectedClientForDrawer}
        onClose={() => setSelectedClientForDrawer(null)}
        onEditClient={(c) => {
          setSelectedClientForDrawer(null);
          setClientToEdit(c);
          setIsModalOpen(true);
        }}
        onCreateOrderForClient={(c) => {
          setSelectedClientForDrawer(null);
          setOrderModalClient(c);
        }}
      />

      {/* Modal Nueva Orden de Trabajo prellenado con el cliente seleccionado */}
      {orderModalClient && (
        <NewWorkOrderModal
          isOpen={Boolean(orderModalClient)}
          onClose={() => setOrderModalClient(null)}
          initialClientPreset={orderModalClient}
          onCreate={(form, createdOrder) => {
            createWorkOrder(form, createdOrder);
            setOrderModalClient(null);
            loadClients();
            showToast(
              "Orden creada exitosamente",
              `Se asoció la OT ${createdOrder.order_number} al cliente ${orderModalClient.business_name}.`
            );
          }}
        />
      )}
    </div>
  );
}
