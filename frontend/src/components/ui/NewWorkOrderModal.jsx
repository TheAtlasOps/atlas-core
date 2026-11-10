import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, FilePlus, RefreshCw, AlertTriangle, CheckCircle2, MapPin } from "lucide-react";
import {
  SERVICE_TYPES,
  PRIORITIES,
  mapServiceTagToEnum,
} from "../../lib/workOrderOptions";
import { api } from "../../lib/api";
import { useWorkOrders } from "../../context/WorkOrderContext";
import AddressLocationPicker from "./AddressLocationPicker";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-[#121212] dark:text-white dark:placeholder:text-gray-500";
const LABEL_CLASS =
  "mb-1.5 block text-xs font-medium text-slate-500 dark:text-gray-400";

/**
 * Formulario interno. Vive solo mientras el modal está abierto, de modo que
 * el estado se reinicia automáticamente en cada apertura o según la orden provista.
 */
function WorkOrderForm({ onClose, onCreate, onUpdate, initialOrder = null }) {
  const { refreshOrders } = useWorkOrders();
  const isEditing = Boolean(initialOrder?.id);

  const [form, setForm] = useState(() => ({
    title: initialOrder?.title || "",
    clientName:
      initialOrder?.client?.business_name ||
      initialOrder?.client_name ||
      initialOrder?.clientName ||
      (typeof initialOrder?.client === "string" ? initialOrder.client : "") ||
      "",
    address:
      initialOrder?.address_override ||
      initialOrder?.location ||
      initialOrder?.client?.address ||
      "",
    lat:
      initialOrder?.lat !== null && initialOrder?.lat !== undefined
        ? Number(initialOrder.lat)
        : null,
    lng:
      initialOrder?.lng !== null && initialOrder?.lng !== undefined
        ? Number(initialOrder.lng)
        : null,
    serviceType:
      initialOrder?.service_type ||
      initialOrder?.tag ||
      initialOrder?.serviceType ||
      "",
    technician:
      initialOrder?.technician_id ||
      initialOrder?.technician?.id ||
      "",
    priority: String(initialOrder?.priority || "MEDIA").toUpperCase(),
    scheduledDate: initialOrder?.scheduled_date
      ? new Date(initialOrder.scheduled_date).toISOString().slice(0, 16)
      : "",
  }));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTechs, setAvailableTechs] = useState([]);
  const [availableClients, setAvailableClients] = useState([]);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchMetadata() {
      try {
        const [techsRes, clientsRes] = await Promise.allSettled([
          api.orders.getTechnicians(),
          api.orders.getClients(),
        ]);
        if (isMounted) {
          if (techsRes.status === "fulfilled" && Array.isArray(techsRes.value)) {
            setAvailableTechs(techsRes.value);
          }
          if (clientsRes.status === "fulfilled" && Array.isArray(clientsRes.value)) {
            setAvailableClients(clientsRes.value);
          }
        }
      } catch (err) {
        console.warn("No se pudieron cargar técnicos o clientes en vivo:", err);
      }
    }
    fetchMetadata();
    return () => {
      isMounted = false;
    };
  }, []);

  const setField = (field) => (e) => {
    setFormError(null);
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const rawParts = (form.address || "").split(",").map((p) => p.trim()).filter(Boolean);
    const dedupedParts = [];
    for (const p of rawParts) {
      if (!dedupedParts.length || dedupedParts[dedupedParts.length - 1].toLowerCase() !== p.toLowerCase()) {
        dedupedParts.push(p);
      }
    }
    const cleanAddress = dedupedParts.join(", ") || form.address;
    const comunaOverride =
      dedupedParts.length > 1
        ? dedupedParts[dedupedParts.length - 1]
        : "Santiago";

    // Determinar ID del técnico seleccionado (UUID real o null)
    const matchedTech = availableTechs.find(
      (t) => t.id === form.technician || t.full_name === form.technician
    );
    const technicianId = matchedTech ? matchedTech.id : null;

    // Determinar ID del cliente
    const matchedClient = availableClients.find(
      (c) => c.business_name.toLowerCase() === (form.clientName || "").trim().toLowerCase()
    );
    const clientId = matchedClient ? matchedClient.id : null;

    // Manejo de fecha programada
    let scheduledDateIso = null;
    let etaIso = null;
    if (form.scheduledDate && form.scheduledDate.trim()) {
      const parsedDate = new Date(form.scheduledDate);
      if (!isNaN(parsedDate.getTime())) {
        scheduledDateIso = parsedDate.toISOString();
        etaIso = new Date(parsedDate.getTime() + 2 * 60 * 60 * 1000).toISOString();
      }
    }

    try {
      if (isEditing) {
        // Actualización de orden existente
        const updatePayload = {
          title: form.title.trim() || undefined,
          service_type: form.serviceType ? mapServiceTagToEnum(form.serviceType) : undefined,
          priority: form.priority ? String(form.priority).toUpperCase() : undefined,
          address_override: cleanAddress,
          comuna_override: comunaOverride,
          lat: form.lat !== null && form.lat !== undefined ? Number(form.lat) : null,
          lng: form.lng !== null && form.lng !== undefined ? Number(form.lng) : null,
          scheduled_date: scheduledDateIso,
          eta: etaIso,
        };

        const updatedOrder = await api.orders.update(initialOrder.id, updatePayload);
        if (!updatedOrder || !updatedOrder.id) {
          throw new Error("El backend no confirmó la actualización de la orden.");
        }

        // Si se cambió el técnico asignado
        if (technicianId && technicianId !== initialOrder.technician_id) {
          try {
            await api.orders.assign(updatedOrder.id, technicianId, etaIso);
          } catch {
            // Silencioso si falla la reasignación puntual
          }
        }

        if (onUpdate) onUpdate(form, updatedOrder);
        else if (onCreate) onCreate(form, updatedOrder);
        await refreshOrders();
        onClose();
      } else {
        // Creación de nueva orden
        const orderPayload = {
          title: form.title.trim() || `${form.serviceType} — ${form.clientName}`,
          description: `Cliente: ${form.clientName} · Dirección: ${form.address}`,
          service_type: mapServiceTagToEnum(form.serviceType),
          priority: String(form.priority || "MEDIA").toUpperCase(),
          client_id: clientId,
          client_name: form.clientName.trim(),
          technician_id: technicianId,
          scheduled_date: scheduledDateIso,
          eta: etaIso,
          address_override: cleanAddress,
          comuna_override: comunaOverride,
          lat: form.lat !== null && form.lat !== undefined ? Number(form.lat) : null,
          lng: form.lng !== null && form.lng !== undefined ? Number(form.lng) : null,
          tag: form.serviceType,
        };

        const createdOrder = await api.orders.create(orderPayload);
        if (!createdOrder || !createdOrder.id) {
          throw new Error("El backend no confirmó la persistencia de la orden.");
        }

        let finalOrder = createdOrder;

        if (technicianId && createdOrder?.id && !createdOrder?.technician_id) {
          try {
            finalOrder = await api.orders.assign(
              createdOrder.id,
              technicianId,
              etaIso
            );
          } catch {
            // Si falla la asignación puntual, conserva la orden recién creada
          }
        }

        if (onCreate) onCreate(form, finalOrder);
        await refreshOrders();
        onClose();
      }
    } catch (err) {
      console.error("Error al guardar la orden de trabajo:", err);
      const msg = err?.message || "No se pudo conectar con el servidor para guardar la orden en Neon.";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
            {isEditing ? (
              <MapPin className="h-5 w-5" aria-hidden="true" />
            ) : (
              <FilePlus className="h-5 w-5" aria-hidden="true" />
            )}
          </div>
          <div>
            <h2
              id="new-wo-title"
              className="text-base font-semibold text-slate-900 dark:text-white"
            >
              {isEditing
                ? `Editar Orden ${initialOrder.order_number || ""}`
                : "Nueva Orden de Trabajo"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              {isEditing
                ? "Modifica los datos técnicos y la ubicación geográfica de la orden"
                : "Completa los detalles para despachar"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {formError && (
        <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error al guardar en el servidor</p>
            <p className="text-[11px] mt-0.5">{formError}</p>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-4">
        <div>
          <label htmlFor="new-wo-title-input" className={LABEL_CLASS}>
            Título del trabajo / requerimiento
          </label>
          <input
            id="new-wo-title-input"
            type="text"
            required
            value={form.title}
            onChange={setField("title")}
            placeholder="Ej: Instalación enlace fibra óptica"
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="new-wo-client" className={LABEL_CLASS}>
            Nombre del Cliente
          </label>
          <input
            id="new-wo-client"
            type="text"
            required
            list="clients-datalist"
            value={form.clientName}
            onChange={(e) => {
              const val = e.target.value;
              const matched = availableClients.find(
                (c) => c.business_name.toLowerCase() === val.trim().toLowerCase()
              );
              setForm((prev) => {
                let clientAddress = prev.address;
                let clientLat = prev.lat;
                let clientLng = prev.lng;
                if (matched) {
                  const addr = matched.address ? matched.address.trim() : "";
                  const com = matched.comuna ? matched.comuna.trim() : "";
                  if (addr && com) {
                    clientAddress = addr.toLowerCase().includes(com.toLowerCase())
                      ? addr
                      : `${addr}, ${com}`;
                  } else {
                    clientAddress = addr || com || prev.address;
                  }
                  if (matched.lat != null && matched.lng != null && prev.lat == null) {
                    clientLat = Number(matched.lat);
                    clientLng = Number(matched.lng);
                  }
                }
                return {
                  ...prev,
                  clientName: val,
                  address: clientAddress,
                  lat: clientLat,
                  lng: clientLng,
                };
              });
            }}
            placeholder="Ej: Entel B2B - Soluciones SpA"
            className={FIELD_CLASS}
          />
          {availableClients.length > 0 && (
            <datalist id="clients-datalist">
              {availableClients.map((c) => (
                <option key={c.id} value={c.business_name}>
                  {c.business_name} ({c.comuna})
                </option>
              ))}
            </datalist>
          )}
        </div>

        {/* Selector interactivo de dirección y ubicación geográfica en mapa */}
        <AddressLocationPicker
          address={form.address}
          onAddressChange={(newAddr) => {
            setFormError(null);
            setForm((prev) => ({ ...prev, address: newAddr }));
          }}
          lat={form.lat}
          lng={form.lng}
          onLocationChange={({ lat, lng, address: updatedAddr }) => {
            setFormError(null);
            setForm((prev) => ({
              ...prev,
              lat,
              lng,
              ...(updatedAddr ? { address: updatedAddr } : {}),
            }));
          }}
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="new-wo-service" className={LABEL_CLASS}>
              Tipo de Servicio
            </label>
            <select
              id="new-wo-service"
              required
              value={form.serviceType}
              onChange={setField("serviceType")}
              className={FIELD_CLASS}
            >
              <option value="" disabled>
                Seleccionar...
              </option>
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="new-wo-priority" className={LABEL_CLASS}>
              Prioridad
            </label>
            <select
              id="new-wo-priority"
              value={form.priority}
              onChange={setField("priority")}
              className={FIELD_CLASS}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="new-wo-tech" className={LABEL_CLASS}>
            Técnico Asignado
          </label>
          <select
            id="new-wo-tech"
            value={form.technician}
            onChange={setField("technician")}
            className={FIELD_CLASS}
            disabled={availableTechs.length === 0}
          >
            {availableTechs.length > 0 ? (
              <>
                <option value="">Sin asignar / Por coordinar</option>
                {availableTechs.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.full_name} {tech.vehicle_plate ? `(${tech.vehicle_plate})` : ""}
                  </option>
                ))}
              </>
            ) : (
              <option value="" disabled>
                No hay técnicos registrados
              </option>
            )}
          </select>
          {availableTechs.length === 0 && (
            <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
              No hay técnicos registrados en la base de datos. La orden se guardará sin técnico asignado.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="new-wo-scheduled-date" className={LABEL_CLASS}>
            Fecha y Hora Programada (Opcional)
          </label>
          <input
            id="new-wo-scheduled-date"
            type="datetime-local"
            value={form.scheduledDate}
            onChange={setField("scheduledDate")}
            className={FIELD_CLASS}
          />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">
            Dejar en blanco si la visita técnica aún está por coordinar con el cliente.
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 active:scale-95 disabled:opacity-60"
        >
          {isSubmitting ? (
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : isEditing ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          {isSubmitting
            ? isEditing
              ? "Guardando..."
              : "Creando..."
            : isEditing
            ? "Guardar Cambios"
            : "Crear Orden"}
        </button>
      </div>
    </form>
  );
}

/**
 * Modal "Nueva / Editar OT". Se controla con estado local desde la vista que lo usa.
 * Renderizado vía createPortal con bloqueo de scroll y cierre con Escape.
 *
 * Props:
 *  - isOpen        {boolean}
 *  - onClose       {() => void}
 *  - onCreate      {(data, order) => void} opcional; recibe los datos del formulario y orden creada
 *  - onUpdate      {(data, order) => void} opcional; recibe los datos del formulario y orden actualizada
 *  - initialOrder  {object} opcional; orden a editar
 */
export default function NewWorkOrderModal({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  initialOrder = null,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const prevBodyOverflow = document.body.style.overflow;
    const mainEl = document.querySelector("main");
    const prevMainOverflow = mainEl ? mainEl.style.overflow : "";

    document.body.style.overflow = "hidden";
    if (mainEl) mainEl.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      if (mainEl) mainEl.style.overflow = prevMainOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-wo-title"
        onClick={(e) => e.stopPropagation()}
        className="relative my-auto w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-[#1e1e1e]"
      >
        <WorkOrderForm
          onClose={onClose}
          onCreate={onCreate}
          onUpdate={onUpdate}
          initialOrder={initialOrder}
        />
      </div>
    </div>,
    document.body
  );
}
