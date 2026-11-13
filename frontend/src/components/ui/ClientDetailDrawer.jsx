import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  X,
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  ClipboardList,
  ArrowRight,
  Edit2,
  Plus,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const STATUS_BADGES = {
  IDLE: {
    label: "Por coordinar",
    classes: "bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300",
  },
  CONFIRMADA: {
    label: "Programada",
    classes: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  },
  EN_RUTA: {
    label: "En ruta",
    classes: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 font-bold",
  },
  EN_SITIO: {
    label: "En sitio",
    classes: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 font-bold",
  },
  COMPLETADA: {
    label: "Completada",
    classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  CANCELADA: {
    label: "Cancelada",
    classes: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  },
};

const PRIORITY_BADGES = {
  BAJA: "text-slate-600 dark:text-gray-400",
  MEDIA: "text-blue-600 dark:text-blue-400",
  ALTA: "text-amber-600 dark:text-amber-400 font-medium",
  URGENTE: "text-rose-600 dark:text-rose-400 font-bold",
};

export default function ClientDetailDrawer({
  client,
  onClose,
  onEditClient,
  onCreateOrderForClient,
}) {
  const [detailData, setDetailData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const userRole = (user?.role || "COORDINADOR").toUpperCase();
  const canEdit = userRole === "ADMIN" || userRole === "COORDINADOR";

  useEffect(() => {
    let isMounted = true;
    if (client?.id) {
      setIsLoading(true);
      setError(null);
      api.clients.getById(client.id)
        .then((data) => {
          if (isMounted) setDetailData(data);
        })
        .catch((err) => {
          console.error("Error al obtener detalle del cliente:", err);
          if (isMounted) {
            setError(err?.message || "No se pudo cargar la información del cliente desde Neon.");
            // Fallback con la información básica inicial
            setDetailData(client);
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    } else {
      setDetailData(null);
    }

    return () => {
      isMounted = false;
    };
  }, [client]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && client) {
        onClose();
      }
    };
    if (client) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [client, onClose]);

  if (!client) return null;

  const currentClient = detailData || client;
  const orders = detailData?.orders || [];
  const activeOrdersCount =
    detailData?.active_orders_count ?? currentClient.active_orders_count ?? 0;
  const totalOrdersCount =
    detailData?.total_orders_count ?? currentClient.total_orders_count ?? orders.length;

  const handleOpenOrder = (orderNumber) => {
    onClose();
    const cleanNum = orderNumber.replace(/^#/, "");
    navigate(`/work-orders?order=${encodeURIComponent(cleanNum)}&search=${encodeURIComponent(cleanNum)}`);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-drawer-title"
      onClick={onClose}
    >
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <aside
          className="w-screen max-w-md transform bg-white dark:bg-[#1e1e1e] border-l border-slate-200 dark:border-gray-800 shadow-2xl transition-all duration-300 ease-in-out flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 shrink-0">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h2
                  id="client-drawer-title"
                  className="text-base font-bold text-foreground leading-tight"
                >
                  {currentClient.business_name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  {currentClient.rut ? (
                    <span className="font-mono text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      RUT: {currentClient.rut}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Cliente Registrado</span>
                  )}
                  {activeOrdersCount > 0 && (
                    <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] font-bold text-orange-600 dark:text-orange-400 border border-orange-500/20">
                      {activeOrdersCount} {activeOrdersCount === 1 ? "OT Activa" : "OTs Activas"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ficha de cliente"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Acciones principales */}
          <div className="p-4 bg-slate-50/70 dark:bg-gray-900/40 border-b border-border flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => onEditClient(currentClient)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Editar Datos
              </button>
            )}
            <button
              type="button"
              onClick={() => onCreateOrderForClient(currentClient)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva Orden
            </button>
          </div>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Mensaje de error si falla la recarga del detalle */}
            {error && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                <p>{error}</p>
              </div>
            )}

            {/* Datos de Contacto */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Información de Contacto
              </h3>
              <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden text-xs">
                {currentClient.contact_person && (
                  <div className="p-3 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4 text-orange-500" />
                      Contacto:
                    </span>
                    <span className="font-medium text-foreground text-right">
                      {currentClient.contact_person}
                    </span>
                  </div>
                )}

                <div className="p-3 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4 text-orange-500" />
                    Correo Principal:
                  </span>
                  <a
                    href={`mailto:${currentClient.contact_email}`}
                    className="font-medium text-orange-600 dark:text-orange-400 hover:underline text-right truncate max-w-[200px]"
                  >
                    {currentClient.contact_email}
                  </a>
                </div>

                <div className="p-3 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4 text-orange-500" />
                    Teléfono:
                  </span>
                  <a
                    href={`tel:${currentClient.contact_phone}`}
                    className="font-medium text-foreground hover:text-orange-500 text-right font-mono"
                  >
                    {currentClient.contact_phone}
                  </a>
                </div>

                <div className="p-3 flex items-start justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-2 shrink-0">
                    <MapPin className="h-4 w-4 text-orange-500 mt-0.5" />
                    Dirección:
                  </span>
                  <div className="text-right">
                    <p className="font-medium text-foreground">{currentClient.address}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {currentClient.comuna}, {currentClient.region || "Metropolitana"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Historial de Órdenes de Trabajo */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4 text-orange-500" />
                  Órdenes Asociadas ({totalOrdersCount})
                </h3>
              </div>

              {isLoading ? (
                <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  <span className="text-xs">Cargando órdenes desde Neon...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  <p>Este cliente no tiene órdenes de trabajo registradas aún.</p>
                  <button
                    type="button"
                    onClick={() => onCreateOrderForClient(currentClient)}
                    className="mt-2.5 inline-flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-semibold hover:underline cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Crear primera orden
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {orders.map((o) => {
                    const statusMeta = STATUS_BADGES[o.status] || {
                      label: o.status,
                      classes: "bg-slate-100 text-slate-700",
                    };
                    const priorityClass =
                      PRIORITY_BADGES[o.priority] || "text-slate-600";

                    return (
                      <div
                        key={o.id}
                        onClick={() => handleOpenOrder(o.order_number)}
                        className="rounded-xl border border-border bg-card p-3.5 hover:border-orange-500/50 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-xs font-bold text-foreground group-hover:text-orange-500 transition-colors">
                              {o.order_number}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusMeta.classes}`}
                            >
                              {statusMeta.label}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${priorityClass}`}
                          >
                            {o.priority}
                          </span>
                        </div>

                        <p className="text-xs font-medium text-foreground mt-2 line-clamp-1">
                          {o.title}
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>
                            {o.technician_name
                              ? `Técnico: ${o.technician_name}`
                              : "Sin técnico asignado"}
                          </span>
                          <span className="flex items-center gap-1 text-orange-500 group-hover:translate-x-0.5 transition-transform font-medium">
                            Ver OT <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>,
    document.body
  );
}
