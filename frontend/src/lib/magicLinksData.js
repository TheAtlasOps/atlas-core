/**
 * Adaptador de datos de Magic Links para Customer Tracking View.
 * Garantiza que cada orden tenga su propio enlace único y coherente con Neon PostgreSQL.
 */

/**
 * Obtiene el token único de seguimiento para una orden.
 * Solo retorna enlaces reales y persistidos en la base de datos (`active_magic_link_token` o `magic_links`).
 * Si no existe un enlace persistido, retorna cadena vacía para indicar "Sin enlace generado".
 */
export function buildOrderMagicToken(order) {
  if (!order) return "";
  const activeToken =
    order.active_magic_link_token ||
    (Array.isArray(order.magic_links) &&
      order.magic_links.find((ml) =>
        ml?.is_active === true && Date.parse(ml.expires_at) > Date.now()
      )?.token);
  if (activeToken && String(activeToken).trim()) {
    return String(activeToken).trim();
  }
  return "";
}

/** La API determina la validez; el contenido del token nunca concede acceso. */
export function getPortalAccessError(error) {
  if (error?.status === 410) {
    return {
      kind: "expired",
      message: "Este enlace de seguimiento ha vencido o fue revocado. Solicita un nuevo enlace al centro de despacho.",
    };
  }
  if (error?.status === 404) {
    return {
      kind: "invalid",
      message: "El enlace de seguimiento no es válido o no existe. Comprueba que copiaste el enlace completo.",
    };
  }
  return {
    kind: "unavailable",
    message: "No pudimos consultar el seguimiento en este momento. Inténtalo de nuevo en unos minutos.",
  };
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

export function computeStepsFromStatusKey(statusKey, hasAssignedTech = false) {
  const rankMap = {
    idle: hasAssignedTech ? 1 : 0,
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
      label: hasAssignedTech && statusKey === "idle" ? "Técnico Asignado" : "Visita Confirmada",
      rank: 1,
      description:
        hasAssignedTech && statusKey === "idle"
          ? "Especialista asignado · En espera de salida a terreno"
          : "Cita agendada y aprobada",
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
      description:
        currentRank >= 4
          ? "Protocolo finalizado y acta disponible"
          : "Pendiente de ejecución y cierre técnico",
    },
  ];

  return definitions.map((def) => ({
    key: def.key,
    label: def.label,
    title: def.label,
    description: def.description,
    timestamp:
      currentRank >= def.rank
        ? currentRank === def.rank && statusKey !== "completada"
          ? "En curso"
          : "Verificado"
        : "Pendiente",
    time:
      currentRank >= def.rank
        ? currentRank === def.rank && statusKey !== "completada"
          ? "En curso"
          : "Verificado"
        : "Pendiente",
    completed: currentRank >= def.rank && currentRank !== -1,
    current: currentRank === def.rank,
  }));
}

export function mapApiSummaryToTrackingOrder(summary) {
  if (!summary) return null;

  const orderNumber = summary.order_number || "#OT-00000";
  const statusKey = (summary.status_key || "idle").toLowerCase();
  const tech = summary.technician || null;
  const techName = tech?.name || "Sin técnico asignado";
  const hasAssignedTech = Boolean(techName && techName !== "Sin técnico asignado");

  let statusLabel = STATUS_KEY_LABELS[statusKey] || "Visita Técnica Programada";
  if (statusKey === "idle") {
    if (hasAssignedTech) {
      statusLabel = "Técnico Asignado · Pendiente de Inicio";
    } else {
      statusLabel = "Pendiente de Asignación";
    }
  }

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
      : computeStepsFromStatusKey(statusKey, hasAssignedTech);
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
