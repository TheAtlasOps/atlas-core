import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, FilePlus, RefreshCw } from "lucide-react";
import {
  SERVICE_TYPES,
  PRIORITIES,
  TECHNICIANS,
  TECHNICIAN_UUID_MAP,
} from "../../lib/workOrderOptions";
import { api } from "../../lib/api";
import { useWorkOrders } from "../../context/WorkOrderContext";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-[#121212] dark:text-white dark:placeholder:text-gray-500";
const LABEL_CLASS =
  "mb-1.5 block text-xs font-medium text-slate-500 dark:text-gray-400";

const INITIAL_FORM = {
  title: "",
  clientName: "",
  address: "",
  serviceType: "",
  technician: "",
  priority: "MEDIA",
};

/**
 * Formulario interno. Vive solo mientras el modal está abierto, de modo que
 * el estado se reinicia automáticamente en cada apertura.
 */
function NewWorkOrderForm({ onClose, onCreate }) {
  const { refreshOrders } = useWorkOrders();
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const addressParts = form.address.split(",");
    const comunaOverride =
      addressParts.length > 1
        ? addressParts[addressParts.length - 1].trim()
        : "Santiago";

    const orderPayload = {
      title: form.title.trim() || `${form.serviceType} — ${form.clientName}`,
      description: `Cliente: ${form.clientName} · Dirección: ${form.address}`,
      service_type: form.serviceType,
      priority: String(form.priority || "MEDIA").toUpperCase(),
      scheduled_date: new Date().toISOString(),
      address_override: form.address,
      comuna_override: comunaOverride,
      tag: form.serviceType,
    };

    try {
      const createdOrder = await api.orders.create(orderPayload);
      let finalOrder = createdOrder;

      if (form.technician && createdOrder?.id) {
        const technicianId =
          TECHNICIAN_UUID_MAP[form.technician] ||
          "00000000-0000-4000-8000-000000000101";
        try {
          finalOrder = await api.orders.assign(
            createdOrder.id,
            technicianId,
            new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          );
        } catch {
          // Si falla la asignación puntual, conserva la orden recién creada
        }
      }

      if (onCreate) onCreate(form, finalOrder);
      await refreshOrders();
    } catch {
      // Fallback en Vercel o sin backend activo: mantiene la creación en estado local
      if (onCreate) onCreate(form, null);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
            <FilePlus className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="new-wo-title"
              className="text-base font-semibold text-slate-900 dark:text-white"
            >
              Nueva Orden de Trabajo
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Completa los detalles para despachar
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
            value={form.clientName}
            onChange={setField("clientName")}
            placeholder="Ej: Sr. Ramírez"
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="new-wo-address" className={LABEL_CLASS}>
            Comuna / Dirección
          </label>
          <input
            id="new-wo-address"
            type="text"
            required
            value={form.address}
            onChange={setField("address")}
            placeholder="Ej: Av. Providencia 1234, Providencia"
            className={FIELD_CLASS}
          />
        </div>

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
            required
            value={form.technician}
            onChange={setField("technician")}
            className={FIELD_CLASS}
          >
            <option value="" disabled>
              Seleccionar técnico...
            </option>
            {TECHNICIANS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
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
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          {isSubmitting ? "Creando..." : "Crear Orden"}
        </button>
      </div>
    </form>
  );
}

/**
 * Modal "Nueva OT". Se controla con estado local desde la vista que lo usa.
 * Renderizado vía createPortal con bloqueo de scroll y cierre con Escape.
 *
 * Props:
 *  - isOpen   {boolean}
 *  - onClose  {() => void}
 *  - onCreate {(data) => void} opcional; recibe los datos del formulario
 */
export default function NewWorkOrderModal({ isOpen, onClose, onCreate }) {
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
        <NewWorkOrderForm onClose={onClose} onCreate={onCreate} />
      </div>
    </div>,
    document.body
  );
}
