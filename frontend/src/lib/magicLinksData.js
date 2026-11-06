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

export function formatCompletedDateDisplay(rawDate) {
  if (!rawDate) return "";
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return String(rawDate);
  try {
    const timeStr = parsed.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const dateStr = parsed.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
    });
    return `${timeStr} hrs (${dateStr})`;
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

  return definitions.map((def) => {
    const isCompleted = currentRank > def.rank || (currentRank === def.rank && statusKey === "completada");
    const isCurrent = currentRank === def.rank && statusKey !== "completada";
    return {
      key: def.key,
      label: def.label,
      title: def.label,
      description: def.description,
      timestamp: null,
      time: null,
      completed: isCompleted,
      current: isCurrent,
    };
  });
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
          timestamp: s.timestamp || s.time || null,
          time: s.timestamp || s.time || null,
          completed: Boolean(s.completed),
          current: Boolean(s.current),
        }))
      : computeStepsFromStatusKey(statusKey, hasAssignedTech);

  const techPlate = tech?.vehicle_plate || null;
  const techPhone = tech?.phone && tech.phone !== "No disponible" ? tech.phone : "";
  const techCredId = tech?.credential_id || tech?.rut || (techPlate ? `TEC-ENT-${techPlate}` : null);
  const isSigned = Boolean(summary.is_signed || summary.signature_url);
  const isAudited = Boolean(summary.is_audited);

  const completedFormatted = formatCompletedDateDisplay(summary.completed_at);
  const etaLabel =
    statusKey === "completada"
      ? (isAudited ? "Servicio finalizado y auditado" : "Servicio finalizado")
      : statusKey === "en_ruta"
      ? "En trayecto a sitio"
      : summary.eta_label || "Horario programado";

  const etaDisplay =
    statusKey === "completada"
      ? null
      : summary.eta || "Por confirmar";

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
    lat: summary.lat !== null && summary.lat !== undefined ? parseFloat(summary.lat) : null,
    lng: summary.lng !== null && summary.lng !== undefined ? parseFloat(summary.lng) : null,
    technician_location: summary.technician_location
      ? {
          lat: parseFloat(summary.technician_location.lat),
          lng: parseFloat(summary.technician_location.lng),
          last_updated_at: summary.technician_location.last_updated_at,
          is_live: Boolean(summary.technician_location.is_live),
        }
      : null,
    scheduled_date: formatScheduledDateDisplay(summary.scheduled_date),
    completed_at: completedFormatted,
    raw_completed_at: summary.completed_at || null,
    eta: etaDisplay,
    etaTimeLeft: etaLabel,
    client: summary.contact_person || summary.company || "Cliente Corporativo",
    company:
      summary.company ||
      summary.business_name ||
      summary.contact_person ||
      "Cliente Entel Empresas",
    phone: summary.contact_phone || "",
    is_confirmed: Boolean(summary.is_confirmed),
    client_confirmed_at: summary.client_confirmed_at || null,
    is_completed: Boolean(summary.is_completed),
    is_signed: isSigned,
    signature_url: summary.signature_url || null,
    signed_at: summary.signed_at || null,
    signed_by_name: summary.signed_by_name || null,
    is_audited: isAudited,
    audited_at: summary.audited_at || null,
    audit_notes: summary.audit_notes || null,
    technician: {
      name: techName,
      phone: techPhone,
      avatar: tech?.avatar || "TC",
      credentialId: techCredId || "No disponible",
      credential_id: techCredId || "No disponible",
      vehicle_plate: techPlate || "No disponible",
      licensePlate: techPlate || "No disponible",
      vehicleType: techPlate ? "Vehículo técnico asignado" : "No disponible",
      role: "Especialista Técnico en Terreno",
      verified: Boolean(hasAssignedTech && (techPlate || tech?.credential_id || tech?.rut)),
    },
    timeline_steps: timelineSteps,
    steps: timelineSteps,
  };
}
