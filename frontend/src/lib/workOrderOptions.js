// Opciones compartidas, Enums oficiales y normalizadores sincronizados con el Backend FastAPI (PostgreSQL Neon).

export const ORDER_STATUS_ENUM = [
  "IDLE",
  "CONFIRMADA",
  "EN_RUTA",
  "EN_SITIO",
  "COMPLETADA",
  "CANCELADA",
];

export const ORDER_PRIORITY_ENUM = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

export const SIM_STATUS_ENUM = [
  "DISPONIBLE",
  "ASIGNADA_TECNICO",
  "INSTALADA",
  "DEFECTUOSA",
  "BAJA",
];

export const SERVICE_TYPES = ["Fibra", "SIM", "Red", "Hardware", "Magic Link"];

export const PRIORITIES = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

export const TECHNICIANS = [];
export const TECHNICIAN_UUID_MAP = {};
export const DEFAULT_CLIENT_UUID = null;

export function getInitials(name) {
  return (
    (name ?? "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "U"
  );
}

export function mapServiceTagToEnum(tag) {
  const normalized = (tag || "").toLowerCase();
  if (normalized.includes("fibra")) return "INSTALACION_FIBRA";
  if (normalized.includes("sim")) return "CAMBIO_SIM";
  if (normalized.includes("red") || normalized.includes("antena")) return "REVISION_ANTENA_4G";
  if (normalized.includes("magic")) return "ACTIVACION_MAGIC_LINK";
  if (normalized.includes("hardware") || normalized.includes("router")) return "DIAGNOSTICO_ROUTER";
  return "INSTALACION_FIBRA";
}

export function mapServiceEnumToTag(serviceType, fallbackTag) {
  if (fallbackTag) return fallbackTag;
  const val = (serviceType || "").toUpperCase();
  if (val.includes("FIBRA")) return "Fibra";
  if (val.includes("SIM") || val.includes("LINEA")) return "SIM";
  if (val.includes("ANTENA") || val.includes("VPN")) return "Red";
  if (val.includes("MAGIC")) return "Magic Link";
  if (val.includes("ROUTER") || val.includes("REPETIDOR") || val.includes("MODEM")) return "Hardware";
  return "Fibra";
}

/**
 * Normaliza un objeto de orden proveniente del backend FastAPI
 * para soportar tanto los campos del backend como los de las tarjetas Kanban.
 */
export function normalizeOrderItem(o) {
  const orderNumber = o.order_number || o.orderId || "#OT-08500";
  const clientName =
    o.client?.business_name ||
    (typeof o.client === "string" ? o.client : null) ||
    o.clientName ||
    "Cliente Corporativo";
  const contactPerson = o.client?.contact_person || o.contactPerson || clientName;
  const contactPhone = o.client?.contact_phone || o.contactPhone || "+56 9 8000 0000";
  const contactEmail = o.client?.contact_email || o.contactEmail || "";
  const address =
    o.address_override || o.client?.address || o.location || "Santiago, RM";
  const comuna =
    o.comuna_override || o.client?.comuna || o.comuna || "Santiago";
  const techName =
    o.technician_summary?.full_name || o.assigneeName || "Sin asignar";
  const techRut = o.technician_summary?.rut || null;
  const techPhone = o.technician_summary?.phone || null;
  const techPlate = o.technician_summary?.vehicle_plate || null;
  const rawPriority = (o.priority || "MEDIA").toString().toUpperCase();
  const priority = ORDER_PRIORITY_ENUM.includes(rawPriority)
    ? rawPriority
    : "MEDIA";
  const rawStatus = (o.status || "CONFIRMADA").toString().toUpperCase();
  const status = ORDER_STATUS_ENUM.includes(rawStatus)
    ? rawStatus
    : "CONFIRMADA";

  return {
    id: o.id ?? orderNumber,
    order_number: orderNumber,
    orderId: orderNumber,
    title: o.title || "Requerimiento técnico",
    description: o.description || null,
    priority,
    status,
    client: {
      id: o.client?.id || o.client_id || null,
      business_name: clientName,
      contact_person: contactPerson,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      address,
      comuna,
      toString() {
        return clientName;
      },
    },
    client_id: o.client_id || o.client?.id || null,
    clientName,
    contactPerson,
    contactPhone,
    contactEmail,
    address_override: address,
    comuna_override: comuna,
    comuna,
    location: address,
    technician_summary: {
      id: o.technician_summary?.id || o.technician_id || null,
      full_name: techName,
      initials: o.technician_summary?.initials || getInitials(techName),
      rut: techRut,
      phone: techPhone,
      vehicle_plate: techPlate,
    },
    assigneeName: techName,
    assignee: o.technician_summary?.initials || getInitials(techName),
    tag: mapServiceEnumToTag(o.service_type, o.tag),
    service_type: o.service_type || "INSTALACION_FIBRA",
    scheduled_date: o.scheduled_date || null,
    eta: o.eta || null,
    completed_at: o.completed_at || null,
    active_magic_link_token: o.active_magic_link_token || null,
    status_history: o.status_history || [],
    lat: o.lat ?? null,
    lng: o.lng ?? null,
  };
}

/**
 * Agrupa una lista plana de órdenes en las 3 columnas del Kanban según OrderStatusEnum
 */
export function buildColumnsFromOrders(ordersList) {
  const normalized = ordersList.map(normalizeOrderItem);
  const asignadas = normalized.filter(
    (o) => o.status === "CONFIRMADA" || o.status === "IDLE"
  );
  const enTransito = normalized.filter(
    (o) => o.status === "EN_RUTA" || o.status === "EN_SITIO"
  );
  const completadas = normalized.filter((o) => o.status === "COMPLETADA");

  return [
    {
      id: "asignada",
      label: "Asignada",
      accentColor: "bg-blue-500",
      tasks: asignadas,
    },
    {
      id: "en-transito",
      label: "En Tránsito",
      accentColor: "bg-amber-500",
      tasks: enTransito,
    },
    {
      id: "completada",
      label: "Completada",
      accentColor: "bg-emerald-500",
      tasks: completadas,
    },
  ];
}

/**
 * Formatea una fecha ISO en hora local chilena (America/Santiago).
 * Soporta automáticamente horarios de verano (UTC-3) e invierno (UTC-4).
 * Retorna null si la fecha es inválida o no está definida.
 */
export function formatChileanDateTime(dateSource, includeYear = false) {
  if (!dateSource) return null;
  try {
    const d = new Date(dateSource);
    if (isNaN(d.getTime())) return null;
    const parts = new Intl.DateTimeFormat("es-CL", {
      timeZone: "America/Santiago",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);

    const day = (parts.find((p) => p.type === "day")?.value || "").padStart(2, "0");
    const month = (parts.find((p) => p.type === "month")?.value || "").padStart(2, "0");
    const year = parts.find((p) => p.type === "year")?.value || "";
    const hour = (parts.find((p) => p.type === "hour")?.value || "").padStart(2, "0");
    const minute = (parts.find((p) => p.type === "minute")?.value || "").padStart(2, "0");

    const datePart = includeYear ? `${day}/${month}/${year}` : `${day}/${month}`;
    return `${datePart} ${hour}:${minute}`;
  } catch {
    return null;
  }
}

/**
 * Adapta una lista de órdenes para el listado de visitas en el Dispatch Board.
 * Utiliza exclusivamente fechas reales entregadas por la API (America/Santiago).
 * Si no cuenta con fecha programada, indica "Por coordinar".
 */
export function buildVisitsFromOrders(ordersList) {
  if (!Array.isArray(ordersList)) return [];
  return ordersList.map((o) => {
    const norm = normalizeOrderItem(o);
    let statusLabel = "Programada";
    let statusStyle = "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/25";
    if (norm.status === "EN_RUTA" || norm.status === "EN_SITIO") {
      statusLabel = "En camino";
      statusStyle = "bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/25";
    } else if (norm.status === "COMPLETADA") {
      statusLabel = "Completada";
      statusStyle = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/25";
    } else if (norm.status === "CANCELADA") {
      statusLabel = "Cancelada";
      statusStyle = "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/25";
    }

    const formattedSchedule = formatChileanDateTime(o.scheduled_date);
    const timeDisplay = formattedSchedule || "Por coordinar";

    const locationPart = (norm.comuna || norm.location || "Santiago").split(",")[0].trim();
    const clientDisplay = `${norm.clientName} — ${locationPart}`;

    return {
      id: norm.orderId,
      time: timeDisplay,
      service: norm.title,
      serviceType: norm.tag,
      client: clientDisplay,
      clientName: norm.clientName,
      location: norm.location,
      status: statusLabel,
      rawStatus: norm.status,
      statusStyle,
      technician: norm.assigneeName,
      hasScheduledDate: Boolean(formattedSchedule),
    };
  });
}

/**
 * Adapta una lista de órdenes para la bitácora de actividad reciente del Dispatch Board.
 * Extrae única y exclusivamente eventos registrados y verificables desde order_status_history.
 * No genera eventos sintéticos ni inventa historiales retrospectivos.
 */
export function buildActivitiesFromOrders(ordersList) {
  if (!Array.isArray(ordersList)) return [];
  const activities = [];

  for (const o of ordersList) {
    const norm = normalizeOrderItem(o);
    const historyList = Array.isArray(o.status_history) ? o.status_history : [];

    for (const h of historyList) {
      if (!h || !h.created_at) continue;

      const formattedTime = formatChileanDateTime(h.created_at);
      if (!formattedTime) continue;

      let action = h.comment;
      if (!action) {
        if (h.old_status && h.new_status) {
          action = `Cambio de estado de ${h.old_status} a ${h.new_status}`;
        } else if (h.new_status) {
          action = `Orden creada en estado ${h.new_status}`;
        } else {
          action = "Actualización de orden registrada";
        }
      }

      const performerName =
        h.changed_by_name ||
        (norm.assigneeName && norm.assigneeName !== "Sin asignar"
          ? norm.assigneeName
          : "Coordinación");

      const performerRole =
        h.changed_by_role ||
        (norm.assigneeName && norm.assigneeName !== "Sin asignar"
          ? "TECNICO"
          : "SISTEMA");

      activities.push({
        id: norm.orderId,
        historyId: h.id,
        performer: performerName,
        performerRole: performerRole,
        technician: performerName,
        client: norm.clientName,
        action,
        status: h.new_status || norm.status,
        serviceType: norm.tag,
        time: formattedTime,
        rawTimestamp: new Date(h.created_at).getTime(),
      });
    }
  }

  // Ordenar cronológicamente descendente (eventos más recientes primero)
  activities.sort((a, b) => b.rawTimestamp - a.rawTimestamp);
  return activities;
}
