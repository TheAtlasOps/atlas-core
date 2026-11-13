import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Plus,
  FilePlus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  SERVICE_TYPES,
  mapServiceTagToEnum,
} from "../../lib/workOrderOptions";
import { api } from "../../lib/api";
import { useWorkOrders } from "../../context/WorkOrderContext";
import AddressLocationPicker from "./AddressLocationPicker";

const FIELD_CLASS =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-[#121212] dark:text-white dark:placeholder:text-gray-500";
const LABEL_CLASS =
  "mb-1.5 block text-xs font-medium text-slate-500 dark:text-gray-400";

const PRIORITY_OPTIONS = [
  {
    value: "BAJA",
    label: "Baja",
    badge: "Baja",
    badgeColor: "bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300",
  },
  {
    value: "MEDIA",
    label: "Media",
    badge: "Media",
    badgeColor: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300",
  },
  {
    value: "ALTA",
    label: "Alta",
    badge: "Alta",
    badgeColor: "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300",
  },
  {
    value: "URGENTE",
    label: "Urgente",
    badge: "Urgente",
    badgeColor: "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300",
  },
];

/**
 * Selector desplegable interactivo y accesible, consistente con el diseño y paleta de ATLAS.
 * Evita la validación nativa HTML de navegadores y garantiza legibilidad total en modo claro y oscuro.
 */
function CustomSelectField({
  id,
  label,
  value,
  onChange,
  options = [],
  placeholder = "Seleccionar...",
  disabled = false,
  hasError = false,
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value ?? "") === String(value ?? "")
  );

  const handleSelect = (opt) => {
    if (opt.disabled) return;
    onChange({ target: { value: opt.value, name: id } });
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label htmlFor={id} className={LABEL_CLASS}>
          {label} {required && <span className="text-orange-500">*</span>}
        </label>
      )}

      {/* Input oculto para accesibilidad, pruebas y lectores de pantalla */}
      <input type="hidden" id={id} name={id} value={value ?? ""} />

      <button
        type="button"
        id={`${id}-btn`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label || placeholder}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-left flex items-center justify-between transition-all cursor-pointer ${
          hasError
            ? "border-rose-500 focus:ring-2 focus:ring-rose-500"
            : isOpen
            ? "border-orange-500 ring-2 ring-orange-500/20"
            : "border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600"
        } ${
          disabled
            ? "bg-slate-100 dark:bg-gray-800 text-slate-400 dark:text-gray-500 cursor-not-allowed"
            : "bg-white dark:bg-[#121212] text-slate-900 dark:text-white"
        }`}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption && selectedOption.value !== "" ? (
            <>
              <span className="font-medium text-slate-900 dark:text-white">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    selectedOption.badgeColor ||
                    "bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300"
                  }`}
                >
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400 dark:text-gray-500">{placeholder}</span>
          )}
        </span>

        <ChevronDown
          className={`h-4 w-4 text-slate-400 dark:text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-orange-500" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-btn`}
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-gray-700 dark:bg-[#1e1e1e] animate-in fade-in zoom-in-95 duration-100"
        >
          {normalizedOptions.map((opt, idx) => {
            const isSelected = String(opt.value ?? "") === String(value ?? "");
            return (
              <div
                key={opt.value ?? idx}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt)}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                  opt.disabled
                    ? "opacity-40 cursor-not-allowed bg-transparent text-slate-400"
                    : isSelected
                    ? "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 font-semibold"
                    : "text-slate-800 hover:bg-slate-100 dark:text-gray-200 dark:hover:bg-gray-800/80"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 min-w-0 pr-2">
                  <span className="truncate">{opt.label}</span>
                  {opt.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        opt.badgeColor ||
                        "bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300"
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}
                  {opt.plateText && (
                    <span className="text-[11px] text-slate-400 dark:text-gray-500 font-mono">
                      {opt.plateText}
                    </span>
                  )}
                </div>

                {isSelected && (
                  <Check className="h-4 w-4 text-orange-500 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const [assignmentConfirmed, setAssignmentConfirmed] = useState(false);

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

  const handleTechnicianChange = (e) => {
    setFormError(null);
    setAssignmentConfirmed(false);
    setForm((prev) => ({ ...prev, technician: e.target.value }));
  };

  const handleScheduledDateChange = (e) => {
    setFormError(null);
    setAssignmentConfirmed(false);
    setForm((prev) => ({ ...prev, scheduledDate: e.target.value }));
  };

  const selectedTech = availableTechs.find(
    (t) => t.id === form.technician || t.full_name === form.technician
  );

  const selectedTechStatus = selectedTech
    ? selectedTech.operational_status || (selectedTech.is_available ? "DISPONIBLE" : "NO_DISPONIBLE")
    : null;

  const scheduledTime = form.scheduledDate ? new Date(form.scheduledDate).getTime() : NaN;
  const isFutureScheduled = !isNaN(scheduledTime) && scheduledTime > Date.now();

  const techOptions = useMemo(() => {
    if (availableTechs.length === 0) {
      return [{ value: "", label: "No hay técnicos registrados", disabled: true }];
    }
    const base = [
      {
        value: "",
        label: "Sin asignar / Por coordinar",
        badge: "Sin asignar",
        badgeColor: "bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400",
      },
    ];
    const list = availableTechs.map((tech) => {
      const opStatus =
        tech.operational_status || (tech.is_available ? "DISPONIBLE" : "NO_DISPONIBLE");
      const statusLabel =
        opStatus === "DISPONIBLE"
          ? "Disponible"
          : opStatus === "ASIGNADO"
          ? "Asignado"
          : opStatus === "OCUPADO"
          ? "Ocupado"
          : "No disponible";
      const badgeColor =
        opStatus === "DISPONIBLE"
          ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
          : opStatus === "ASIGNADO"
          ? "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
          : opStatus === "OCUPADO"
          ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
          : "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300";
      const ordersBadge = tech.active_orders_count > 0 ? ` · ${tech.active_orders_count} OT` : "";
      const plateText = tech.vehicle_plate ? ` [${tech.vehicle_plate}]` : "";

      return {
        value: tech.id,
        label: `${tech.full_name}${plateText}`,
        badge: `${statusLabel}${ordersBadge}`,
        badgeColor,
      };
    });
    return [...base, ...list];
  }, [availableTechs]);

  let isAssignmentBlocked = false;
  let requiresConfirmation = false;
  let blockMessage = "";

  if (selectedTech) {
    if (selectedTechStatus === "NO_DISPONIBLE") {
      isAssignmentBlocked = true;
      blockMessage = "Técnico bloqueado administrativamente. Seleccione otro técnico o guarde la orden sin asignar.";
    } else if (selectedTechStatus === "OCUPADO") {
      if (!isFutureScheduled) {
        isAssignmentBlocked = true;
        blockMessage = "Técnico ocupado en terreno. Las asignaciones inmediatas están bloqueadas; programe una fecha futura o guarde la orden sin asignar.";
      } else {
        requiresConfirmation = true;
      }
    } else if (selectedTechStatus === "ASIGNADO") {
      requiresConfirmation = true;
    }
  }

  const canSubmitAssignment = !isAssignmentBlocked && (!requiresConfirmation || assignmentConfirmed);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    if (!form.serviceType || !form.serviceType.trim()) {
      setFormError("Por favor seleccione un Tipo de Servicio para la orden.");
      setIsSubmitting(false);
      return;
    }

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
          await api.orders.assign(
            updatedOrder.id,
            technicianId,
            etaIso,
            Boolean(assignmentConfirmed),
            scheduledDateIso
          );
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
          confirm_assignment: Boolean(technicianId && assignmentConfirmed),
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
          finalOrder = await api.orders.assign(
            createdOrder.id,
            technicianId,
            etaIso,
            Boolean(assignmentConfirmed),
            scheduledDateIso
          );
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
    <form noValidate onSubmit={handleSubmit}>
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
          <CustomSelectField
            id="new-wo-service"
            label="Tipo de Servicio"
            required
            value={form.serviceType}
            onChange={setField("serviceType")}
            options={SERVICE_TYPES}
            placeholder="Seleccionar..."
            hasError={!form.serviceType && Boolean(formError)}
          />

          <CustomSelectField
            id="new-wo-priority"
            label="Prioridad"
            value={form.priority}
            onChange={setField("priority")}
            options={PRIORITY_OPTIONS}
            placeholder="Seleccionar prioridad..."
          />
        </div>

        <div>
          <CustomSelectField
            id="new-wo-tech"
            label="Técnico Asignado"
            value={form.technician}
            onChange={handleTechnicianChange}
            options={techOptions}
            placeholder={
              availableTechs.length === 0
                ? "No hay técnicos registrados"
                : "Sin asignar / Por coordinar"
            }
            disabled={availableTechs.length === 0}
          />

          {/* Banners informativos y de control según estado operativo */}
          {selectedTech && (
            <div className="mt-2.5 space-y-2">
              {selectedTechStatus === "NO_DISPONIBLE" && (
                <div className="flex flex-col gap-1.5 rounded-xl border border-rose-300 bg-rose-50/95 p-3 text-xs text-rose-900 shadow-xs dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-rose-950 dark:text-rose-100">
                        Asignación bloqueada — Técnico No Disponible
                      </p>
                      <p className="leading-relaxed">
                        El técnico se encuentra bloqueado administrativamente (licencia o indisponibilidad). No se permite asignarle nuevas órdenes hasta que sea habilitado en la sección de Técnicos.
                      </p>
                      <p className="font-semibold text-rose-800 dark:text-rose-300">
                        Para continuar, seleccione otro técnico disponible o elija «Sin asignar / Por coordinar».
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedTechStatus === "OCUPADO" && !isFutureScheduled && (
                <div className="flex flex-col gap-1.5 rounded-xl border border-amber-300 bg-amber-50/95 p-3 text-xs text-amber-900 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-amber-950 dark:text-amber-100">
                        Asignación inmediata no permitida — Técnico Ocupado
                      </p>
                      <p className="leading-relaxed">
                        El técnico está actualmente en terreno (en ruta o en sitio) atendiendo {selectedTech.active_orders_count || 1} orden(es). Las asignaciones inmediatas están bloqueadas para resguardar la atención en curso.
                      </p>
                      <p className="font-semibold text-amber-800 dark:text-amber-300">
                        Para asignarlo a una visita futura, ingrese una Fecha y Hora Programada posterior al momento actual.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedTechStatus === "OCUPADO" && isFutureScheduled && (
                <div className="flex flex-col gap-2 rounded-xl border border-amber-400/80 bg-amber-50/95 p-3 text-xs text-amber-900 shadow-xs dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-amber-950 dark:text-amber-100">
                        Visita futura programada — Revisión de agenda requerida
                      </p>
                      <p className="leading-relaxed">
                        El técnico está actualmente ocupado. Se detectó una fecha programada futura. La plataforma no garantiza ausencia de conflictos de horario; la agenda del técnico debe ser revisada por el coordinador.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-start gap-2.5 rounded-lg border border-amber-300/80 bg-white/80 p-2.5 cursor-pointer dark:border-amber-800/60 dark:bg-gray-900/60 hover:bg-white dark:hover:bg-gray-900 transition-colors">
                    <input
                      type="checkbox"
                      checked={assignmentConfirmed}
                      onChange={(e) => setAssignmentConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-amber-400 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="font-semibold text-amber-950 dark:text-amber-100 text-xs leading-snug">
                      Confirmo que revisé la agenda del técnico y autorizo la asignación de esta visita futura programada.
                    </span>
                  </label>
                </div>
              )}

              {selectedTechStatus === "ASIGNADO" && (
                <div className="flex flex-col gap-2 rounded-xl border border-blue-300 bg-blue-50/95 p-3 text-xs text-blue-900 shadow-xs dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-blue-950 dark:text-blue-100">
                        Técnico con asignaciones previas
                      </p>
                      <p className="leading-relaxed">
                        El técnico ya tiene {selectedTech.active_orders_count || 1} orden(es) asignada(s) pendientes de atención. Asignar esta orden sumará carga adicional a su cola de trabajo.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-start gap-2.5 rounded-lg border border-blue-200/80 bg-white/80 p-2.5 cursor-pointer dark:border-blue-800/60 dark:bg-gray-900/60 hover:bg-white dark:hover:bg-gray-900 transition-colors">
                    <input
                      type="checkbox"
                      checked={assignmentConfirmed}
                      onChange={(e) => setAssignmentConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-blue-950 dark:text-blue-100 text-xs leading-snug">
                      Confirmo la asignación de esta orden adicional bajo mi supervisión como coordinador.
                    </span>
                  </label>
                </div>
              )}

              {selectedTechStatus === "DISPONIBLE" && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Técnico disponible para asignación inmediata (sin órdenes en curso).</span>
                </div>
              )}
            </div>
          )}
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
            onChange={handleScheduledDateChange}
            className={FIELD_CLASS}
          />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">
            Dejar en blanco si la visita técnica aún está por coordinar con el cliente.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5">
          {isAssignmentBlocked && (
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              {blockMessage}
            </span>
          )}
          {!isAssignmentBlocked && requiresConfirmation && !assignmentConfirmed && (
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Marque la casilla de confirmación para habilitar la asignación.
            </span>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !canSubmitAssignment}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              !canSubmitAssignment && blockMessage
                ? blockMessage
                : !canSubmitAssignment && requiresConfirmation && !assignmentConfirmed
                ? "Requiere confirmación explícita del coordinador"
                : ""
            }
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
