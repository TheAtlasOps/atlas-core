/**
 * Adaptador de datos de Magic Links para Customer Tracking View.
 * Garantiza que cada orden tenga su propio enlace único y coherente con Neon PostgreSQL.
 */

export const MAGIC_LINKS_DATA = [];

export const KNOWN_EXPIRED_TOKENS = new Set([
  "nT7vB3",
  "token_magic_providencia_8491_abc",
  "LOiu9FDFcil-CsQNvNTZazYD8Sx8-18E43J8FlXMbQs",
]);

export function getTrackingDataByUuid() {
  return null;
}

const DETERMINISTIC_TOKEN_REGEX = /^atlas_(ot-\d+)_([0-9a-f]{6})$/i;

/**
 * Obtiene el token único de seguimiento para una orden.
 * Si la orden ya tiene un token activo en la base de datos (`active_magic_link_token`), lo usa.
 * Si aún no tiene fila en `magic_links`, genera un token determinístico único por orden
 * (`atlas_ot-08493_000003`) para que nunca dos órdenes compartan el mismo enlace.
 */
export function buildOrderMagicToken(order) {
  if (!order) return "";
  const activeToken =
    order.active_magic_link_token ||
    (Array.isArray(order.magic_links) &&
      order.magic_links.find((ml) => ml?.is_active !== false)?.token);
  if (activeToken && String(activeToken).trim()) {
    return String(activeToken).trim();
  }

  const rawOt = String(order.order_number || order.orderId || "ot-00000")
    .replace("#", "")
    .trim()
    .toLowerCase();
  const idSuffix =
    String(order.id || "")
      .replace(/-/g, "")
      .slice(-6)
      .toLowerCase() || "000000";

  return `atlas_${rawOt}_${idSuffix}`;
}

export function parseDeterministicMagicToken(token) {
  if (!token || typeof token !== "string") return null;
  const match = DETERMINISTIC_TOKEN_REGEX.exec(token.trim());
  if (!match) return null;
  return {
    orderNumber: `#${match[1].toUpperCase()}`,
    idSuffix: match[2].toLowerCase(),
  };
}

export function isLikelyExpiredToken(token) {
  if (!token || typeof token !== "string") return false;
  const clean = token.trim();
  if (KNOWN_EXPIRED_TOKENS.has(clean)) return true;
  const lower = clean.toLowerCase();
  return (
    lower.includes("expir") ||
    lower.includes("vencid") ||
    lower.includes("caducad") ||
    lower.includes("inactiv") ||
    lower.includes("revok")
  );
}

const STATUS_KEY_LABELS = {
  idle: "Pendiente de Asignación",
  confirmada: "Visita Confirmada",
  en_ruta: "Técnico en Ruta",
  en_sitio: "Técnico en el Lugar",
  completada: "Servicio Completado",
  cancelada: "Servicio Cancelado",
};

function formatScheduledDateDisplay(rawDate) {
  if (!rawDate) return "Horario por confirmar";
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return String(rawDate);
  try {
    return parsed.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(rawDate);
  }
}

export function computeStepsFromStatusKey(statusKey) {
  const rankMap = {
    idle: 0,
    confirmada: 1,
    en_ruta: 2,
    en_sitio: 3,
    completada: 4,
    cancelada: -1,
  };
  const currentRank = rankMap[statusKey] ?? 0;

  const definitions = [
    {
      key: "confirmada",
      label: "Visita Confirmada",
      rank: 1,
      description: "Cita agendada y aprobada",
    },
    {
      key: "en_ruta",
      label: "Técnico en Ruta",
      rank: 2,
      description: "Especialista desplazándose al lugar",
    },
    {
      key: "en_sitio",
      label: "Técnico en el Lugar",
      rank: 3,
      description: "Atención técnica en ejecución",
    },
    {
      key: "completada",
      label: "Servicio Completado",
      rank: 4,
      description: "Protocolo finalizado y acta disponible",
    },
  ];

  return definitions.map((def) => ({
    key: def.key,
    label: def.label,
    title: def.label,
    description: def.description,
    timestamp: currentRank >= def.rank ? "Verificado" : "Pendiente",
    time: currentRank >= def.rank ? "Verificado" : "Pendiente",
    completed: currentRank >= def.rank && currentRank !== -1,
    current: currentRank === def.rank,
  }));
}

export function buildSummaryFromOrderEntity(order) {
  if (!order) return null;
  const rawStatus = String(order.status || "IDLE").toUpperCase();
  const statusKey = rawStatus.toLowerCase();
  const tech = order.technician_summary || order.technician || null;
  const techName =
    tech?.full_name || tech?.name || order.assigneeName || order.assignee || "";

  let etaTime = "Por confirmar";
  if (order.eta) {
    const d = new Date(order.eta);
    if (!Number.isNaN(d.getTime())) {
      etaTime = d.toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  } else if (order.scheduled_date) {
    const d = new Date(order.scheduled_date);
    if (!Number.isNaN(d.getTime())) {
      etaTime = d.toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  return {
    order_id: order.id,
    order_number: order.order_number || order.orderId,
    title: order.title,
    company: order.client?.business_name || order.clientName || "Empresa Cliente",
    status: STATUS_KEY_LABELS[statusKey] || rawStatus,
    status_key: statusKey,
    service_type: order.service_type
      ? String(order.service_type).replace(/_/g, " ")
      : order.title || "Servicio Técnico Atlas",
    scheduled_date: order.scheduled_date,
    eta: etaTime,
    eta_label:
      statusKey === "completada"
        ? "Finalizado"
        : statusKey === "en_ruta"
        ? "En trayecto"
        : "Llegada estimada",
    address:
      order.address_override ||
      order.client?.address ||
      order.location ||
      "Dirección en terreno",
    comuna: order.comuna_override || order.client?.comuna || "",
    contact_person:
      order.client?.contact_person ||
      order.clientContactPerson ||
      order.client?.business_name ||
      "Contacto Cliente",
    contact_phone:
      order.client?.contact_phone || order.clientPhone || "+56 9 8765 4321",
    technician: techName
      ? {
          name: techName,
          phone: tech?.phone || "+56 9 8765 4321",
          avatar:
            tech?.initials ||
            techName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase(),
          vehicle_plate: tech?.vehicle_plate || order.technicianPlate || "Por asignar",
        }
      : null,
    timeline_steps: computeStepsFromStatusKey(statusKey),
    is_confirmed: ["confirmada", "en_ruta", "en_sitio", "completada"].includes(
      statusKey
    ),
    is_completed: statusKey === "completada",
    signature_url: null,
  };
}

export function mapApiSummaryToTrackingOrder(summary) {
  if (!summary) return null;

  const orderNumber = summary.order_number || "#OT-00000";
  const statusKey = (summary.status_key || "idle").toLowerCase();

  const timelineSteps =
    Array.isArray(summary.timeline_steps) && summary.timeline_steps.length > 0
      ? summary.timeline_steps.map((s) => ({
          key: s.key,
          label: s.label || s.title || s.key,
          title: s.label || s.title || s.key,
          description: s.description || "",
          timestamp: s.timestamp || s.time || "—",
          time: s.timestamp || s.time || "—",
          completed: Boolean(s.completed),
          current: Boolean(s.current),
        }))
      : computeStepsFromStatusKey(statusKey);

  const tech = summary.technician || null;
  const techName = tech?.name || "Sin técnico asignado";
  const techPlate = tech?.vehicle_plate || "Por asignar";

  const etaLabel =
    statusKey === "completada"
      ? "Servicio finalizado"
      : statusKey === "en_ruta"
      ? "En trayecto a sitio"
      : summary.eta_label || "Horario programado";

  return {
    order_id: summary.order_id,
    order_number: orderNumber,
    orderNumber: orderNumber,
    status: summary.status || STATUS_KEY_LABELS[statusKey] || "En curso",
    status_key: statusKey,
    statusKey: statusKey,
    statusLabel: STATUS_KEY_LABELS[statusKey] || summary.status || "En curso",
    serviceType:
      summary.title || summary.service_type || "Servicio Técnico Atlas Entel",
    address: summary.address || "Dirección del Cliente",
    comuna: summary.comuna || "",
    scheduled_date: formatScheduledDateDisplay(summary.scheduled_date),
    eta: summary.eta || "Por confirmar",
    etaTimeLeft: etaLabel,
    client: summary.contact_person || summary.company || "Cliente Corporativo",
    company:
      summary.company ||
      summary.business_name ||
      summary.contact_person ||
      "Cliente Entel Empresas",
    phone: summary.contact_phone || "+56 9 8765 4321",
    is_confirmed: Boolean(summary.is_confirmed),
    is_completed: Boolean(summary.is_completed),
    signature_url: summary.signature_url || null,
    technician: {
      name: techName,
      phone: tech?.phone || "",
      avatar: tech?.avatar || "TC",
      credentialId:
        techPlate && techPlate !== "Por asignar"
          ? `TEC-ENT-${techPlate}`
          : "TEC-ENT-ASIGNADO",
      vehicle_plate: techPlate,
      licensePlate: techPlate,
      vehicleType: "Unidad Móvil Entel Empresas",
      role: "Especialista Técnico en Terreno",
      verified: Boolean(tech?.name),
    },
    timeline_steps: timelineSteps,
    steps: timelineSteps,
  };
}
