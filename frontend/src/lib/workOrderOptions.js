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

export const TECHNICIANS = [
  "Alexander Sáez López",
  "Carlos Mendoza",
  "Juan Rojas",
  "Luis Paredes",
  "Matías Koch",
  "Tomás Castro",
  "Esteban Kral",
  "Sebastián Araya",
];

export const TECHNICIAN_UUID_MAP = {
  "Alexander Sáez López": "a0000000-0000-0000-0000-000000000003",
  "Carlos Mendoza": "b0000000-0000-0000-0000-000000000001",
  "Juan Rojas": "b0000000-0000-0000-0000-000000000002",
  "Luis Paredes": "b0000000-0000-0000-0000-000000000003",
  "Matías Koch": "b0000000-0000-0000-0000-000000000004",
  "Tomás Castro": "b0000000-0000-0000-0000-000000000005",
  "Esteban Kral": "b0000000-0000-0000-0000-000000000006",
  "Sebastián Araya": "b0000000-0000-0000-0000-000000000007",
};

export const DEFAULT_CLIENT_UUID = "c0000000-0000-0000-0000-000000000001";

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
      id: o.client?.id || o.client_id || DEFAULT_CLIENT_UUID,
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
    client_id: o.client_id || o.client?.id || DEFAULT_CLIENT_UUID,
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
 * Adapta una lista de órdenes para el listado de visitas en el Dispatch Board.
 */
export function buildVisitsFromOrders(ordersList) {
  if (!Array.isArray(ordersList)) return [];
  return ordersList.map((o, idx) => {
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

    const baseHours = 14 + Math.floor(idx / 2);
    const baseMins = (idx % 2) * 30;
    const timeStr = `${String(baseHours).padStart(2, "0")}:${String(baseMins).padStart(2, "0")}`;

    const locationPart = (norm.comuna || norm.location || "Santiago").split(",")[0].trim();
    const clientDisplay = `${norm.clientName} — ${locationPart}`;

    return {
      id: norm.orderId,
      time: o.scheduled_time || o.time || timeStr,
      service: norm.title,
      serviceType: norm.tag,
      client: clientDisplay,
      clientName: norm.clientName,
      location: norm.location,
      status: statusLabel,
      rawStatus: norm.status,
      statusStyle,
      technician: norm.assigneeName,
    };
  });
}

/**
 * Adapta una lista de órdenes para la bitácora de actividad reciente del Dispatch Board.
 */
export function buildActivitiesFromOrders(ordersList) {
  if (!Array.isArray(ordersList)) return [];
  return ordersList.map((o, idx) => {
    const norm = normalizeOrderItem(o);
    let action = "Actualizó estado de la OT";
    let status = "Programada";
    if (norm.status === "COMPLETADA") {
      action = "Marcó visita como completada";
      status = "Completada";
    } else if (norm.status === "EN_RUTA") {
      action = "Inició desplazamiento hacia el lugar";
      status = "En camino";
    } else if (norm.status === "EN_SITIO") {
      action = "Llegó al sitio del cliente";
      status = "En camino";
    } else if (norm.status === "CONFIRMADA") {
      action = "Confirmó asignación de visita técnica";
      status = "Programada";
    } else {
      action = "Orden registrada pendiente de inicio";
      status = "Programada";
    }

    const minuteVal = Math.max(10, 58 - idx * 8);
    const minuteStr = String(minuteVal).padStart(2, "0");

    return {
      id: norm.orderId,
      technician: norm.assigneeName,
      client: norm.clientName,
      action,
      status,
      serviceType: norm.tag,
      time: `13:${minuteStr}`,
    };
  });
}
