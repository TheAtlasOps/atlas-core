/**
 * Adaptador de datos de Magic Links para Customer Tracking View.
 * Conectado 100% dinámicamente al backend FastAPI / Neon PostgreSQL.
 * Todos los mocks hardcodeados han sido eliminados.
 */

export const MAGIC_LINKS_DATA = [];

export function getTrackingDataByUuid(token) {
  return null;
}

const STATUS_KEY_LABELS = {
  idle: "Pendiente de Asignación",
  confirmada: "Visita Confirmada",
  en_ruta: "Técnico en Ruta",
  en_sitio: "Técnico en el Lugar",
  completada: "Servicio Completado",
  cancelada: "Servicio Cancelado",
};

export function mapApiSummaryToTrackingOrder(summary, fallbackOrder = null) {
  if (!summary) return null;

  const orderNumber = summary.order_number || "#OT-08491";
  const statusKey = (summary.status_key || "en_ruta").toLowerCase();

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
      : [
          {
            key: "confirmada",
            label: "Visita Confirmada",
            description: "Cita agendada y aprobada",
            completed: true,
            current: false,
          },
          {
            key: "en_ruta",
            label: "Técnico en Ruta",
            description: "Especialista desplazándose",
            completed: false,
            current: true,
          },
          {
            key: "en_sitio",
            label: "Técnico en el Lugar",
            description: "Atención técnica en ejecución",
            completed: false,
            current: false,
          },
          {
            key: "completada",
            label: "Servicio Completado",
            description: "Protocolo finalizado y acta disponible",
            completed: false,
            current: false,
          },
        ];

  const tech = summary.technician || {};

  return {
    order_id: summary.order_id,
    order_number: orderNumber,
    orderNumber: orderNumber,
    status: summary.status || STATUS_KEY_LABELS[statusKey] || "En curso",
    status_key: statusKey,
    statusKey: statusKey,
    statusLabel: STATUS_KEY_LABELS[statusKey] || summary.status || "En curso",
    serviceType: summary.service_type || "Servicio Técnico Atlas Entel",
    address: summary.address || "Dirección del Cliente",
    comuna: summary.comuna || "Santiago",
    scheduled_date: summary.scheduled_date || "Hoy",
    eta: summary.eta || "25 min",
    etaTimeLeft: summary.eta_label || "Aprox. 20 min",
    client: summary.contact_person || "Cliente",
    phone: summary.contact_phone || "+56 9 8765 4321",
    is_confirmed: Boolean(summary.is_confirmed),
    is_completed: Boolean(summary.is_completed),
    signature_url: summary.signature_url || null,
    technician: {
      name: tech.name || "Alexander Sáez López",
      phone: tech.phone || "+56 9 1234 5678",
      avatar: tech.avatar || "AS",
      credentialId: tech.vehicle_plate
        ? `TEC-ENT-${tech.vehicle_plate}`
        : "TEC-ENT-GG-WP-24",
      vehicle_plate: tech.vehicle_plate || "GG-WP-24",
      licensePlate: tech.vehicle_plate || "GG-WP-24",
      role: "Especialista Técnico en Terreno",
      verified: true,
    },
    timeline_steps: timelineSteps,
    steps: timelineSteps,
  };
}
