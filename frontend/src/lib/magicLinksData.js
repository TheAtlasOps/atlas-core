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
    orderNumber: "OT-08495",
    status: "Activo",
    statusKey: "en_ruta",
    statusLabel: "Técnico en Ruta",
    createdAgo: "Hace 2 horas",
    url: "https://atlas.entel.cl/ml/xK9pQ2",
    serviceType: "Activación y Configuración Magic Link",
    address: "Calle Irarrázaval 890, Of. 402, Ñuñoa, RM",
    eta: "14:30 hrs",
    etaTimeLeft: "Aprox. 20 min",
    technician: {
      name: "Matías Abarca",
      credentialId: "TEC-ENT-84920",
      role: "Especialista en Conectividad y Redes",
      vehicleType: "Furgón Operativo",
      licensePlate: "AB-CD-12",
      phone: "+56 9 8765 4321",
      zone: "RM Central",
      verified: true,
    },
    steps: [
      {
        key: "registrada",
        title: "Orden Registrada",
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
        key: "en_curso",
        title: "Atención en Curso",
        description: "Ejecución de trabajos técnicos y pruebas de enlace.",
        time: "Estimado 14:35 hrs",
      },
      {
        key: "finalizado",
        title: "Servicio Finalizado",
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
    orderNumber: "OT-08471",
    status: "Expirado",
    statusKey: "finalizado",
    statusLabel: "Servicio Finalizado",
    createdAgo: "Hace 3 días",
    url: "https://atlas.entel.cl/ml/mR4wL8",
    serviceType: "Instalación Fibra Óptica 500M",
    address: "Av. Las Condes 10200, Piso 3, Las Condes, RM",
    eta: "Finalizado",
    etaTimeLeft: "Visita concluida",
    technician: {
      name: "Carlos Mendoza",
      credentialId: "TEC-ENT-72104",
      role: "Técnico Senior de Planta Externa",
      vehicleType: "Camioneta Técnica 4x4",
      licensePlate: "CM-99-ZZ",
      phone: "+56 9 7654 3210",
      zone: "RM Oriente",
      verified: true,
    },
    steps: [
      {
        key: "registrada",
        title: "Orden Registrada",
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
        key: "en_curso",
        title: "Atención en Curso",
        description: "Tendido de acometida, fusión de fibra y certificación de potencia.",
        time: "10:45 hrs",
      },
      {
        key: "finalizado",
        title: "Servicio Finalizado",
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
    orderNumber: "OT-08512",
    status: "Activo",
    statusKey: "en_ruta",
    statusLabel: "Técnico en Ruta",
    createdAgo: "Hace 30 min",
    url: "https://atlas.entel.cl/ml/nT7vB3",
    serviceType: "Diagnóstico Router Empresarial y Red",
    address: "Av. Vitacura 4100, Piso 5, Vitacura, RM",
    eta: "15:15 hrs",
    etaTimeLeft: "Aprox. 45 min",
    technician: {
      name: "Felipe Soto",
      credentialId: "TEC-ENT-65019",
      role: "Especialista en Equipos y Routing",
      vehicleType: "Furgón Eléctrico Entel",
      licensePlate: "FS-18-KT",
      phone: "+56 9 9321 8876",
      zone: "RM Norte",
      verified: true,
    },
    steps: [
      {
        key: "registrada",
        title: "Orden Registrada",
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
        key: "en_curso",
        title: "Atención en Curso",
        description: "Revisión física del router corporativo y verificación de puertos.",
        time: "Estimado 15:20 hrs",
      },
      {
        key: "finalizado",
        title: "Servicio Finalizado",
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
