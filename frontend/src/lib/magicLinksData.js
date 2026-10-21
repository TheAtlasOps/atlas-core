/**
 * Fuente de datos compartida para Magic Links y Customer Tracking View.
 * Permite que los técnicos, clientes y OTs coincidan con veracidad entre el listado
 * administrativo y el portal de seguimiento del cliente.
 */

export const MAGIC_LINKS_DATA = [
  {
    id: "ml-001",
    token: "xK9pQ2",
    client: "Juan Pérez",
    company: "PYME Clientes SpA",
    phone: "+56 9 8123 4567",
    ot: "#OT-08495",
    order_number: "OT-08495",
    orderNumber: "OT-08495",
    status: "Activo",
    status_key: "en_ruta",
    statusKey: "en_ruta",
    statusLabel: "Técnico en Ruta",
    createdAgo: "Hace 2 horas",
    url: "https://atlas.entel.cl/ml/xK9pQ2",
    serviceType: "Activación y Configuración Magic Link",
    address: "Calle Irarrázaval 890, Of. 402, Ñuñoa, RM",
    comuna: "Ñuñoa",
    scheduled_date: "Hoy · Bloque PM",
    eta: "14:30 hrs",
    etaTimeLeft: "Aprox. 20 min",
    technician: {
      name: "Matías Abarca",
      avatar: "MA",
      credentialId: "TEC-ENT-84920",
      role: "Especialista en Conectividad y Redes",
      vehicleType: "Furgón Operativo",
      vehicle_plate: "AB-CD-12",
      licensePlate: "AB-CD-12",
      phone: "+56 9 8765 4321",
      zone: "RM Central",
      verified: true,
    },
    timeline_steps: [
      {
        key: "confirmada",
        label: "Orden Confirmada",
        title: "Orden Confirmada",
        description: "Requerimiento validado y programado en sistema central Atlas.",
        timestamp: "08:45 hrs",
        time: "08:45 hrs",
        completed: true,
        current: false,
      },
      {
        key: "en_ruta",
        label: "Técnico en Ruta",
        title: "Técnico en Ruta",
        description: "Personal asignado en trayecto hacia sus instalaciones.",
        timestamp: "13:50 hrs",
        time: "13:50 hrs",
        completed: false,
        current: true,
      },
      {
        key: "en_sitio",
        label: "Técnico en Sitio",
        title: "Técnico en Sitio",
        description: "Ejecución de trabajos técnicos y pruebas de enlace.",
        timestamp: "Estimado 14:35 hrs",
        time: "Estimado 14:35 hrs",
        completed: false,
        current: false,
      },
      {
        key: "completada",
        label: "Servicio Completado",
        title: "Servicio Completado",
        description: "Certificación operativa y firma de acta de conformidad.",
        timestamp: "Estimado 16:00 hrs",
        time: "Estimado 16:00 hrs",
        completed: false,
        current: false,
      },
    ],
    steps: [
      {
        key: "confirmada",
        title: "Orden Confirmada",
        description: "Requerimiento validado y programado en sistema central Atlas.",
        time: "08:45 hrs",
      },
      {
        key: "en_ruta",
        title: "Técnico en Ruta",
        description: "Personal asignado en trayecto hacia sus instalaciones.",
        time: "13:50 hrs",
      },
      {
        key: "en_sitio",
        title: "Técnico en Sitio",
        description: "Ejecución de trabajos técnicos y pruebas de enlace.",
        time: "Estimado 14:35 hrs",
      },
      {
        key: "completada",
        title: "Servicio Completado",
        description: "Certificación operativa y firma de acta de conformidad.",
        time: "Estimado 16:00 hrs",
      },
    ],
  },
  {
    id: "ml-002",
    token: "mR4wL8",
    client: "Camila Rojas",
    company: "Inversiones Las Condes",
    phone: "+56 9 7654 3210",
    ot: "#OT-08471",
    order_number: "OT-08471",
    orderNumber: "OT-08471",
    status: "Expirado",
    status_key: "completada",
    statusKey: "completada",
    statusLabel: "Servicio Completado",
    createdAgo: "Hace 3 días",
    url: "https://atlas.entel.cl/ml/mR4wL8",
    serviceType: "Instalación Fibra Óptica 500M",
    address: "Av. Las Condes 10200, Piso 3, Las Condes, RM",
    comuna: "Las Condes",
    scheduled_date: "Completada",
    eta: "Finalizado",
    etaTimeLeft: "Visita concluida",
    technician: {
      name: "Carlos Mendoza",
      avatar: "CM",
      credentialId: "TEC-ENT-72104",
      role: "Técnico Senior de Planta Externa",
      vehicleType: "Camioneta Técnica 4x4",
      vehicle_plate: "CM-99-ZZ",
      licensePlate: "CM-99-ZZ",
      phone: "+56 9 7654 3210",
      zone: "RM Oriente",
      verified: true,
    },
    timeline_steps: [
      {
        key: "confirmada",
        label: "Orden Confirmada",
        title: "Orden Confirmada",
        description: "Requerimiento validado y agendado por coordinación técnica.",
        timestamp: "09:00 hrs",
        time: "09:00 hrs",
        completed: true,
        current: false,
      },
      {
        key: "en_ruta",
        label: "Técnico en Ruta",
        title: "Técnico en Ruta",
        description: "Técnico en trayecto con herramientas e insumos ópticos.",
        timestamp: "10:15 hrs",
        time: "10:15 hrs",
        completed: true,
        current: false,
      },
      {
        key: "en_sitio",
        label: "Técnico en Sitio",
        title: "Técnico en Sitio",
        description: "Tendido de acometida, fusión de fibra y certificación de potencia.",
        timestamp: "10:45 hrs",
        time: "10:45 hrs",
        completed: true,
        current: false,
      },
      {
        key: "completada",
        label: "Servicio Completado",
        title: "Servicio Completado",
        description: "Pruebas de velocidad conformes y acta firmada por el cliente.",
        timestamp: "11:45 hrs",
        time: "11:45 hrs",
        completed: true,
        current: true,
      },
    ],
    steps: [
      {
        key: "confirmada",
        title: "Orden Confirmada",
        description: "Requerimiento validado y agendado por coordinación técnica.",
        time: "09:00 hrs",
      },
      {
        key: "en_ruta",
        title: "Técnico en Ruta",
        description: "Técnico en trayecto con herramientas e insumos ópticos.",
        time: "10:15 hrs",
      },
      {
        key: "en_sitio",
        title: "Técnico en Sitio",
        description: "Tendido de acometida, fusión de fibra y certificación de potencia.",
        time: "10:45 hrs",
      },
      {
        key: "completada",
        title: "Servicio Completado",
        description: "Pruebas de velocidad conformes y acta firmada por el cliente.",
        time: "11:45 hrs",
      },
    ],
  },
  {
    id: "ml-003",
    token: "nT7vB3",
    client: "Diego Soto",
    company: "Soluciones Vitacura SpA",
    phone: "+56 9 9321 8876",
    ot: "#OT-08512",
    order_number: "OT-08512",
    orderNumber: "OT-08512",
    status: "Activo",
    status_key: "en_sitio",
    statusKey: "en_sitio",
    statusLabel: "Técnico en Sitio",
    createdAgo: "Hace 30 min",
    url: "https://atlas.entel.cl/ml/nT7vB3",
    serviceType: "Diagnóstico Router Empresarial y Red",
    address: "Av. Vitacura 4100, Piso 5, Vitacura, RM",
    comuna: "Vitacura",
    scheduled_date: "Hoy · Bloque PM",
    eta: "15:15 hrs",
    etaTimeLeft: "En atención",
    technician: {
      name: "Felipe Soto",
      avatar: "FS",
      credentialId: "TEC-ENT-65019",
      role: "Especialista en Equipos y Routing",
      vehicleType: "Furgón Eléctrico Entel",
      vehicle_plate: "FS-18-KT",
      licensePlate: "FS-18-KT",
      phone: "+56 9 9321 8876",
      zone: "RM Norte",
      verified: true,
    },
    timeline_steps: [
      {
        key: "confirmada",
        label: "Orden Confirmada",
        title: "Orden Confirmada",
        description: "Ingreso de ticket por soporte técnico y asignación de móvil.",
        timestamp: "12:10 hrs",
        time: "12:10 hrs",
        completed: true,
        current: false,
      },
      {
        key: "en_ruta",
        label: "Técnico en Ruta",
        title: "Técnico en Ruta",
        description: "Móvil en ruta hacia la dirección corporativa informada.",
        timestamp: "14:20 hrs",
        time: "14:20 hrs",
        completed: true,
        current: false,
      },
      {
        key: "en_sitio",
        label: "Técnico en Sitio",
        title: "Técnico en Sitio",
        description: "Revisión física del router corporativo y verificación de puertos.",
        timestamp: "15:15 hrs",
        time: "15:15 hrs",
        completed: false,
        current: true,
      },
      {
        key: "completada",
        label: "Servicio Completado",
        title: "Servicio Completado",
        description: "Conexión normalizada y cierre de requerimiento.",
        timestamp: "Estimado 16:30 hrs",
        time: "Estimado 16:30 hrs",
        completed: false,
        current: false,
      },
    ],
    steps: [
      {
        key: "confirmada",
        title: "Orden Confirmada",
        description: "Ingreso de ticket por soporte técnico y asignación de móvil.",
        time: "12:10 hrs",
      },
      {
        key: "en_ruta",
        title: "Técnico en Ruta",
        description: "Móvil en ruta hacia la dirección corporativa informada.",
        time: "14:20 hrs",
      },
      {
        key: "en_sitio",
        title: "Técnico en Sitio",
        description: "Revisión física del router corporativo y verificación de puertos.",
        time: "15:15 hrs",
      },
      {
        key: "completada",
        title: "Servicio Completado",
        description: "Conexión normalizada y cierre de requerimiento.",
        time: "Estimado 16:30 hrs",
      },
    ],
  },
];

/**
 * Busca los datos de seguimiento asociados a un ID o Token de Magic Link.
 * Si no encuentra coincidencia exacta, retorna el primer registro por defecto.
 */
export function getTrackingDataByUuid(uuid) {
  if (!uuid) return MAGIC_LINKS_DATA[0];

  const clean = String(uuid).trim().toLowerCase();
  const match = MAGIC_LINKS_DATA.find(
    (item) =>
      item.id.toLowerCase() === clean ||
      item.token.toLowerCase() === clean ||
      item.orderNumber.toLowerCase() === clean ||
      item.ot.replace("#", "").toLowerCase() === clean.replace("#", "")
  );

  return match || MAGIC_LINKS_DATA[0];
}

const STATUS_KEY_LABELS = {
  confirmada: "Orden Confirmada",
  en_ruta: "Técnico en Ruta",
  en_sitio: "Técnico en Sitio",
  completada: "Servicio Completado",
};

/**
 * Transforma la respuesta de `api.clientPortal.getSummary(token)` al formato
 * normalizado del portal público del cliente, conservando fallback seguro.
 */
export function mapApiSummaryToTrackingOrder(summary, fallbackOrder = MAGIC_LINKS_DATA[0]) {
  if (!summary) return fallbackOrder;

  const statusKey = summary.status_key || fallbackOrder.status_key || "en_ruta";
  const orderNumber = summary.order_number || fallbackOrder.order_number;

  const timelineSteps =
    Array.isArray(summary.timeline_steps) && summary.timeline_steps.length > 0
      ? summary.timeline_steps.map((s) => ({
          key: s.key,
          label: s.label || s.title || STATUS_KEY_LABELS[s.key] || s.key,
          title: s.label || s.title || STATUS_KEY_LABELS[s.key] || s.key,
          description: s.description || "Etapa de servicio verificada en plataforma ATLAS.",
          timestamp: s.timestamp || s.time || "—",
          time: s.timestamp || s.time || "—",
          completed: Boolean(s.completed),
          current: Boolean(s.current),
        }))
      : fallbackOrder.timeline_steps;

  return {
    ...fallbackOrder,
    order_id: summary.order_id || fallbackOrder.id,
    order_number: orderNumber,
    orderNumber: orderNumber,
    status: summary.status || fallbackOrder.status,
    status_key: statusKey,
    statusKey: statusKey,
    statusLabel: STATUS_KEY_LABELS[statusKey] || summary.status || fallbackOrder.statusLabel,
    serviceType: summary.service_type || fallbackOrder.serviceType,
    address: summary.address || fallbackOrder.address,
    comuna: summary.comuna || fallbackOrder.comuna || "Santiago",
    scheduled_date: summary.scheduled_date || fallbackOrder.scheduled_date,
    eta: summary.eta || summary.eta_label || fallbackOrder.eta,
    etaTimeLeft: summary.eta_label || fallbackOrder.etaTimeLeft,
    client: summary.contact_person || fallbackOrder.client,
    phone: summary.contact_phone || fallbackOrder.phone,
    is_confirmed: Boolean(summary.is_confirmed),
    is_completed: Boolean(summary.is_completed),
    signature_url: summary.signature_url || null,
    technician: {
      ...fallbackOrder.technician,
      name: summary.technician?.name || fallbackOrder.technician.name,
      phone: summary.technician?.phone || fallbackOrder.technician.phone,
      avatar: summary.technician?.avatar || fallbackOrder.technician.avatar,
      vehicle_plate:
        summary.technician?.vehicle_plate || fallbackOrder.technician.vehicle_plate,
      licensePlate:
        summary.technician?.vehicle_plate || fallbackOrder.technician.licensePlate,
    },
    timeline_steps: timelineSteps,
    steps: timelineSteps,
  };
}
