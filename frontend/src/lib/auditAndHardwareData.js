/**
 * Datos mock realistas y adaptadores para el paquete de Auditoría de OT (Evidencias)
 * e Inventario de Hardware (SIMs y Routers), alineados con los Enums oficiales
 * del esquema PostgreSQL / Neon (`sim_cards`, `equipment`, `work_order_evidences`, `clients`).
 */

export const INITIAL_HARDWARE_INVENTORY = [
  {
    id: "33333333-3333-4333-8333-333333333301",
    deviceType: "SIM",
    model: "SIM M2M Industrial 5G",
    identifier: "89560200102400018491",
    secondaryId: "IMSI: 730010240001849 · +56 9 1122 0001",
    operator: "Entel Corporativo",
    technology: "5G",
    status: "INSTALADA",
    orderId: "#OT-08491",
    technician: "Juan Rivas",
    clientId: "22222222-2222-4222-8222-222222222201",
    location: "Providencia",
  },
  {
    id: "44444444-4444-4444-8444-444444444401",
    deviceType: "Router",
    model: "Teltonika RUTX50 Industrial",
    identifier: "RTR-ENTEL-2024-001",
    secondaryId: "MAC: B8:27:EB:01:44:A1",
    operator: "Entel Corporativo",
    technology: "5G",
    status: "INSTALADA",
    orderId: "#OT-08491",
    technician: "Juan Rivas",
    clientId: "22222222-2222-4222-8222-222222222201",
    location: "Providencia",
  },
  {
    id: "33333333-3333-4333-8333-333333333302",
    deviceType: "SIM",
    model: "SIM Corporativa Multi-APN",
    identifier: "89560200102400018492",
    secondaryId: "IMSI: 730010240001850 · +56 9 1122 0002",
    operator: "Entel Corporativo",
    technology: "5G",
    status: "ASIGNADA_TECNICO",
    orderId: "#OT-08492",
    technician: "Luis Pinto",
    clientId: null,
    location: "Santiago Centro",
  },
  {
    id: "44444444-4444-4444-8444-444444444402",
    deviceType: "Router",
    model: "Teltonika RUT240 IoT",
    identifier: "RTR-ENTEL-2024-002",
    secondaryId: "MAC: B8:27:EB:02:55:B2",
    operator: "Entel M2M",
    technology: "4G LTE",
    status: "ASIGNADA_TECNICO",
    orderId: "#OT-08493",
    technician: "María Kovalenko",
    clientId: null,
    location: "Las Condes",
  },
  {
    id: "33333333-3333-4333-8333-333333333303",
    deviceType: "SIM",
    model: "SIM M2M Industrial 5G",
    identifier: "89560200102400018493",
    secondaryId: "IMSI: 730010240001851 · +56 9 1122 0003",
    operator: "Entel Corporativo",
    technology: "5G",
    status: "DISPONIBLE",
    orderId: null,
    technician: null,
    clientId: null,
    location: "Bodega Central RM",
  },
  {
    id: "44444444-4444-4444-8444-444444444403",
    deviceType: "Router",
    model: "MikroTik hEX S Gigabit",
    identifier: "RTR-ENTEL-2024-003",
    secondaryId: "MAC: B8:27:EB:03:66:C3",
    operator: "Entel Corporativo",
    technology: "5G",
    status: "DISPONIBLE",
    orderId: null,
    technician: null,
    clientId: null,
    location: "Bodega Central RM",
  },
  {
    id: "33333333-3333-4333-8333-333333333304",
    deviceType: "SIM",
    model: "SIM IoT Telemetría LTE",
    identifier: "89560200102400018494",
    secondaryId: "IMSI: 730010240001852 · +56 9 1122 0004",
    operator: "Entel M2M",
    technology: "4G LTE",
    status: "DISPONIBLE",
    orderId: null,
    technician: null,
    clientId: null,
    location: "Bodega Central RM",
  },
  {
    id: "44444444-4444-4444-8444-444444444404",
    deviceType: "Router",
    model: "Huawei B310s-518 CPE",
    identifier: "RTR-ENTEL-2024-004",
    secondaryId: "MAC: B8:27:EB:04:77:D4",
    operator: "Entel Corporativo",
    technology: "4G LTE",
    status: "ASIGNADA_TECNICO",
    orderId: "#OT-08494",
    technician: "Tomás Castro",
    clientId: null,
    location: "Vitacura",
  },
  {
    id: "33333333-3333-4333-8333-333333333305",
    deviceType: "SIM",
    model: "SIM Empresarial Alto Tráfico",
    identifier: "89560200102400018495",
    secondaryId: "IMSI: 730010240001853 · +56 9 1122 0005",
    operator: "Entel Corporativo",
    technology: "5G",
    status: "INSTALADA",
    orderId: "#OT-08498",
    technician: "Elena Kravets",
    clientId: "22222222-2222-4222-8222-222222222201",
    location: "Santiago Centro",
  },
  {
    id: "33333333-3333-4333-8333-333333333306",
    deviceType: "SIM",
    model: "SIM M2M Industrial",
    identifier: "89560200102400018496",
    secondaryId: "IMSI: 730010240001854 · +56 9 1122 0006",
    operator: "Entel M2M",
    technology: "4G LTE",
    status: "DEFECTUOSA",
    orderId: "#OT-08499",
    technician: "Luis Pinto",
    clientId: null,
    location: "Laboratorio RMA",
  },
  {
    id: "44444444-4444-4444-8444-444444444405",
    deviceType: "Router",
    model: "Cisco Catalyst IR1101 Rugged",
    identifier: "RTR-ENTEL-2024-005",
    secondaryId: "MAC: B8:27:EB:05:88:E5",
    operator: "Entel Corporativo",
    technology: "5G",
    status: "DISPONIBLE",
    orderId: null,
    technician: null,
    clientId: null,
    location: "Bodega Central RM",
  },
  {
    id: "44444444-4444-4444-8444-444444444406",
    deviceType: "Router",
    model: "ZTE MC801A 5G Indoor",
    identifier: "RTR-ENTEL-2024-006",
    secondaryId: "MAC: B8:27:EB:06:99:F6",
    operator: "Entel Corporativo",
    technology: "5G",
    status: "BAJA",
    orderId: "#OT-08496",
    technician: "Elena Kravets",
    clientId: null,
    location: "Revisión Técnica RM",
  },
];

/**
 * Normaliza un estado de equipo o SIM hacia SimStatusEnum oficial
 */
export function normalizeSimStatus(rawStatus) {
  const s = (rawStatus || "").toUpperCase();
  if (s === "DISPONIBLE" || s === "AVAILABLE") return "DISPONIBLE";
  if (s === "ASIGNADA_TECNICO" || s === "ASIGNADO_TECNICO" || s === "ASIGNADO") {
    return "ASIGNADA_TECNICO";
  }
  if (s === "INSTALADA" || s === "INSTALADO") return "INSTALADA";
  if (s === "DEFECTUOSA" || s === "DEFECTUOSO" || s === "EN FALLA") return "DEFECTUOSA";
  if (s === "BAJA") return "BAJA";
  return "DISPONIBLE";
}

/**
 * Adapta una SIM proveniente de `api.inventory.getSims()` al formato de tabla
 */
export function mapApiSimToInventoryItem(sim) {
  const status = normalizeSimStatus(sim.status);
  const is4G = (sim.notes || "").toUpperCase().includes("4G");
  return {
    id: String(sim.id),
    deviceType: "SIM",
    model: sim.notes || "SIM Corporativa Multi-APN Entel",
    identifier: sim.iccid,
    secondaryId: [
      sim.imsi ? `IMSI: ${sim.imsi}` : null,
      sim.msisdn ? sim.msisdn : null,
    ]
      .filter(Boolean)
      .join(" · ") || "APN: m2m.entel.cl",
    operator: sim.operator || "Entel",
    technology: is4G ? "4G LTE" : "5G",
    status,
    orderId: sim.installed_client_name ? `Cliente: ${sim.installed_client_name}` : null,
    technician: sim.assigned_technician_name || null,
    clientId: sim.installed_client_id || null,
    location: sim.installed_client_name || "Bodega Central RM",
  };
}

/**
 * Adapta un Router proveniente de `api.inventory.getRouters()` al formato de tabla
 */
export function mapApiRouterToInventoryItem(router) {
  const status = normalizeSimStatus(router.status);
  const is5G = (router.type || "").toUpperCase().includes("5G") || (router.model || "").includes("50");
  return {
    id: String(router.id),
    deviceType: "Router",
    model: `${router.brand || ""} ${router.model || ""}`.trim() || "Router Industrial CPE",
    identifier: router.serial_number,
    secondaryId: router.mac_address ? `MAC: ${router.mac_address}` : `Tipo: ${router.type || "ROUTER_5G"}`,
    operator: "Entel Corporativo",
    technology: is5G ? "5G" : "4G LTE",
    status,
    orderId: router.installed_client_name ? `Cliente: ${router.installed_client_name}` : null,
    technician: router.assigned_technician_name || null,
    clientId: router.installed_client_id || null,
    location: router.installed_client_name || "Bodega Central RM",
  };
}

// Metadatos específicos por OT para enriquecer la auditoría
const ORDER_SPECIFIC_PRESETS = {
  "#OT-08491": {
    signalDbm: "-62 dBm",
    rsrp: "-84 dBm",
    sinr: "24.5 dB",
    downloadMbps: "340.8 Mbps",
    uploadMbps: "94.2 Mbps",
    pingMs: "9 ms",
    routerModel: "Teltonika RUTX50 Industrial",
    routerSerial: "RTR-ENTEL-2024-001",
    routerMac: "B8:27:EB:01:44:A1",
    simIccid: "89560200102400018491",
    simTechnology: "5G",
    recipientName: "Camila Valenzuela",
    recipientRole: "Jefa de Operaciones TI — Oficinas Providencia S.A.",
    recipientRut: "15.842.910-K",
    signedAt: "13:52 hrs",
  },
  "#OT-08492": {
    signalDbm: "-59 dBm",
    rsrp: "-81 dBm",
    sinr: "26.1 dB",
    downloadMbps: "412.0 Mbps",
    uploadMbps: "110.5 Mbps",
    pingMs: "8 ms",
    routerModel: "Cisco Catalyst IR1101",
    routerSerial: "RTR-ENTEL-2024-008",
    routerMac: "B8:27:EB:08:12:C4",
    simIccid: "89560200102400018492",
    simTechnology: "5G",
    recipientName: "Rodrigo Silva",
    recipientRole: "Coordinador de Redes — Entel HQ Corporativo",
    recipientRut: "13.491.220-4",
    signedAt: "14:18 hrs",
  },
  "#OT-08493": {
    signalDbm: "-64 dBm",
    rsrp: "-86 dBm",
    sinr: "22.8 dB",
    downloadMbps: "285.4 Mbps",
    uploadMbps: "76.0 Mbps",
    pingMs: "12 ms",
    routerModel: "Teltonika RUT240 IoT",
    routerSerial: "RTR-ENTEL-2024-002",
    routerMac: "B8:27:EB:02:55:B2",
    simIccid: "89560200102400018497",
    simTechnology: "5G",
    recipientName: "Ignacia Morales",
    recipientRole: "Subgerente de Infraestructura — Torre Costanera Hub",
    recipientRut: "16.203.884-1",
    signedAt: "15:40 hrs",
  },
  "#OT-08494": {
    signalDbm: "-65 dBm",
    rsrp: "-88 dBm",
    sinr: "21.4 dB",
    downloadMbps: "245.9 Mbps",
    uploadMbps: "68.3 Mbps",
    pingMs: "14 ms",
    routerModel: "Huawei B310s-518 CPE",
    routerSerial: "RTR-ENTEL-2024-004",
    routerMac: "B8:27:EB:04:77:D4",
    simIccid: "89560200102400018498",
    simTechnology: "5G",
    recipientName: "Felipe Castro",
    recipientRole: "Encargado de Sistemas — Empresas Vitacura SpA",
    recipientRut: "14.775.319-8",
    signedAt: "15:05 hrs",
  },
  "#OT-08495": {
    signalDbm: "-61 dBm",
    rsrp: "-83 dBm",
    sinr: "25.0 dB",
    downloadMbps: "328.6 Mbps",
    uploadMbps: "91.4 Mbps",
    pingMs: "10 ms",
    routerModel: "MikroTik hEX S Gigabit",
    routerSerial: "RTR-ENTEL-2024-003",
    routerMac: "B8:27:EB:03:66:C3",
    simIccid: "89560200102400018499",
    simTechnology: "5G",
    recipientName: "Daniela Rojas",
    recipientRole: "Administradora General — Comercial Ñuñoa Ltda.",
    recipientRut: "17.332.109-2",
    signedAt: "16:12 hrs",
  },
  "#OT-08498": {
    signalDbm: "-60 dBm",
    rsrp: "-82 dBm",
    sinr: "25.8 dB",
    downloadMbps: "390.2 Mbps",
    uploadMbps: "104.7 Mbps",
    pingMs: "9 ms",
    routerModel: "Teltonika RUTX50 Industrial",
    routerSerial: "RTR-ENTEL-2024-010",
    routerMac: "B8:27:EB:10:AA:01",
    simIccid: "89560200102400018495",
    simTechnology: "5G",
    recipientName: "Gonzalo Vidal",
    recipientRole: "Jefe de Infraestructura TI — BancoEstado Casa Matriz",
    recipientRut: "12.908.441-7",
    signedAt: "12:45 hrs",
  },
};

/**
 * Genera el paquete completo de auditoría para cualquier OT del Kanban,
 * fusionando los datos de `api.orders.getById(id)` si el backend está activo.
 */
export function getOrderAuditPackage(order, customHardwareMap = {}, apiOrderDetail = null) {
  if (!order) return null;

  const orderKey = apiOrderDetail?.order_number || order.order_number || order.orderId || "#OT-08491";
  const preset = ORDER_SPECIFIC_PRESETS[orderKey] || {};
  const overrideHw = customHardwareMap[orderKey] || customHardwareMap[order.orderId] || {};

  const signalDbm = preset.signalDbm || "-62 dBm";
  const rsrp = preset.rsrp || "-84 dBm";
  const sinr = preset.sinr || "24.5 dB";
  const downloadMbps = preset.downloadMbps || "312.4 Mbps";
  const uploadMbps = preset.uploadMbps || "88.6 Mbps";
  const pingMs = preset.pingMs || "11 ms";

  const routerModel = overrideHw.routerModel || preset.routerModel || "Teltonika RUTX50 Industrial";
  const routerSerial = overrideHw.routerSerial || preset.routerSerial || "RTR-ENTEL-2024-001";
  const routerMac = overrideHw.routerMac || preset.routerMac || "B8:27:EB:01:44:A1";
  const simIccid = overrideHw.simIccid || preset.simIccid || "89560200102400018491";
  const simTechnology = overrideHw.simTechnology || preset.simTechnology || "5G";

  const clientBusinessName =
    apiOrderDetail?.client?.business_name ||
    order.client?.business_name ||
    (typeof order.client === "string" ? order.client : null) ||
    "Cliente Corporativo Entel";

  const recipientName =
    apiOrderDetail?.client?.contact_person ||
    preset.recipientName ||
    clientBusinessName;

  const recipientRole =
    preset.recipientRole || `Jefe de Operaciones TI — ${clientBusinessName}`;
  const recipientRut = preset.recipientRut || "15.642.891-5";
  const signedAt = preset.signedAt || "14:25 hrs";

  const coordsText =
    apiOrderDetail?.lat && apiOrderDetail?.lng
      ? `${Number(apiOrderDetail.lat).toFixed(4)}, ${Number(apiOrderDetail.lng).toFixed(4)} · RM`
      : "-33.4320, -70.6093 · RM";

  return {
    orderId: orderKey,
    evidences: [
      {
        id: `${orderKey}-ev-1`,
        title: "Estado físico del Router",
        dbType: "FOTO_DESPUES",
        timestamp: "13:34 hrs",
        status: "Verificado",
        kind: "router",
        ModelRef: routerModel,
        SerialRef: routerSerial,
        description:
          "Equipo montado en bandeja ventilada de rack corporativo, energizado con doble fuente y LEDs de portadora 5G en verde fijo.",
        gps: coordsText,
      },
      {
        id: `${orderKey}-ev-2`,
        title: "Instalación de antena/cableado",
        dbType: "FOTO_ANTES",
        timestamp: "13:41 hrs",
        status: "Verificado",
        kind: "antenna",
        ModelRef: "Antena MIMO 4x4 Direccional",
        SerialRef: "Patchcord Cat6A Blindado",
        description:
          "Fijación mecánica certificada, sellado contra humedad en conectores SMA y etiquetado normativo Entel en acometida.",
        gps: coordsText,
      },
      {
        id: `${orderKey}-ev-3`,
        title: "Test de velocidad en pantalla",
        dbType: "TEST_VELOCIDAD",
        timestamp: "13:49 hrs",
        status: "Verificado",
        kind: "speedtest",
        ModelRef: `${downloadMbps} DL / ${uploadMbps} UL`,
        SerialRef: `Potencia ${signalDbm} · Ping ${pingMs}`,
        description:
          "Prueba de estrés de enlace completada sin pérdida de paquetes hacia nodo central Entel Amunátegui.",
        gps: coordsText,
      },
    ],
    telemetry: {
      signalDbm,
      signalStatus: "Óptimo (-50 a -75 dBm)",
      rsrp,
      sinr,
      downloadMbps,
      uploadMbps,
      pingMs,
      band: "Banda n78 (3.5 GHz) · 5G NSA/SA",
    },
    checklist: [
      {
        id: "chk-signal",
        label: `Potencia de señal ${signalDbm} verificada en punto de instalación`,
        metric: `${signalDbm} (Óptimo)`,
        passed: true,
      },
      {
        id: "chk-rsrp",
        label: "Parámetros de radiofrecuencia RSRP / SINR óptimos",
        metric: `RSRP ${rsrp} · SINR ${sinr}`,
        passed: true,
      },
      {
        id: "chk-nav",
        label: "Prueba de navegación, DNS corporativo y baja latencia superada",
        metric: `${downloadMbps} / ${pingMs}`,
        passed: true,
      },
      {
        id: "chk-hw",
        label: "Validación cruzada de ICCID y N° de Serie contra base de datos",
        metric: "Sincronizado",
        passed: true,
      },
    ],
    hardware: {
      router: {
        model: routerModel,
        serial: routerSerial,
        mac: routerMac,
        type: "ROUTER_5G",
        status: "INSTALADO",
      },
      sim: {
        iccid: simIccid,
        operator: "Entel Corporativo",
        technology: simTechnology,
        apn: "m2m.entel.cl",
        status: "INSTALADA",
      },
    },
    conformity: {
      recipientName,
      recipientRole,
      recipientRut,
      signedAt,
      tokenHash:
        apiOrderDetail?.active_magic_link_token ||
        `ML-${orderKey.replace("#", "")}-VERIFIED`,
    },
  };
}
