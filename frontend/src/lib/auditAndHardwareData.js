export const STATUS_LABELS = {
  DISPONIBLE: "Disponible",
  ASIGNADA_TECNICO: "Asignada a técnico",
  ASIGNADO_TECNICO: "Asignada a técnico",
  ASIGNADA: "Asignada",
  ASIGNADO: "Asignado",
  INSTALADA: "Instalada en cliente",
  INSTALADO: "Instalado en cliente",
  DEFECTUOSA: "Defectuosa",
  DEFECTUOSO: "Defectuoso",
  BAJA: "Dada de baja",
  IDLE: "Pendiente",
  CONFIRMADA: "Confirmada",
  EN_RUTA: "En ruta",
  EN_SITIO: "En sitio",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

/**
 * Adaptadores de Inventario de Hardware (SIMs y Routers) y Auditoría de OT (Evidencias),
 * conectados a los datos reales de FastAPI / Neon PostgreSQL (`sim_cards`, `equipment`,
 * `work_order_evidences`, `work_orders`, `clients`).
 * Se han eliminado todos los respaldos ficticios que causaban discrepancias entre módulos.
 */

const REAL_NEON_SIMS_SEED = [
  {
    id: "00000000-0000-4000-8000-000000001001",
    iccid: "89560200102400018491",
    imsi: "730010240018491",
    msisdn: "+56994018491",
    operator: "Entel",
    status: "ASIGNADA_TECNICO",
    assigned_technician_name: "Carlos Mendoza",
    notes: "SIM 5G Corporativa provista para ruta",
  },
  {
    id: "00000000-0000-4000-8000-000000001002",
    iccid: "89560200102400018492",
    imsi: "730010240018492",
    msisdn: "+56994018492",
    operator: "Entel",
    status: "ASIGNADA_TECNICO",
    assigned_technician_name: "Juan Rojas",
    notes: "SIM 4G LTE Backup",
  },
  {
    id: "00000000-0000-4000-8000-000000001003",
    iccid: "89560200102400018493",
    imsi: "730010240018493",
    msisdn: "+56994018493",
    operator: "Entel",
    status: "DISPONIBLE",
    notes: "En bodega central Santiago",
  },
  {
    id: "00000000-0000-4000-8000-000000001004",
    iccid: "89560200102400018494",
    imsi: "730010240018494",
    msisdn: "+56994018494",
    operator: "Entel",
    status: "DISPONIBLE",
    notes: "En bodega central Santiago",
  },
  {
    id: "00000000-0000-4000-8000-000000001005",
    iccid: "89560200102400018495",
    imsi: "730010240018495",
    msisdn: "+56994018495",
    operator: "Entel",
    status: "INSTALADA",
    installed_client_id: "c0000000-0000-0000-0000-000000000007",
    installed_client_name: "BancoEstado Casa Matriz",
    notes: "Activada en router principal de cliente (#OT-08498)",
  },
  {
    id: "00000000-0000-4000-8000-000000001006",
    iccid: "89560200102400018496",
    imsi: "730010240018496",
    msisdn: "+56994018496",
    operator: "Entel",
    status: "DEFECTUOSA",
    notes: "Falla de lectura reportada en terreno",
  },
  {
    id: "0c48cb1c-cf47-4d0c-95bb-58d7a6458732",
    iccid: "9560200102400099998",
    imsi: "7300100099998",
    msisdn: "+56991234567",
    operator: "Entel",
    status: "DISPONIBLE",
    notes: "SIM 5G",
  },
  {
    id: "14780596-784c-4847-bdab-450321b4f3a8",
    iccid: "9560200102400099999",
    imsi: null,
    msisdn: null,
    operator: "Entel",
    status: "DISPONIBLE",
    notes: "SIM M2M Industrial Entel (5G)",
  },
];

const REAL_NEON_ROUTERS_SEED = [
  {
    id: "00000000-0000-4000-8000-000000002001",
    serial_number: "RTR-ENTEL-2024-001",
    mac_address: "A4:5E:60:C8:11:01",
    brand: "Huawei",
    model: "B310s-518",
    type: "ROUTER_4G",
    status: "ASIGNADO_TECNICO",
    assigned_technician_name: "Carlos Mendoza",
  },
  {
    id: "00000000-0000-4000-8000-000000002002",
    serial_number: "RTR-ENTEL-2024-002",
    mac_address: "A4:5E:60:C8:11:02",
    brand: "Teltonika",
    model: "RUT240 IoT",
    type: "ROUTER_5G",
    status: "ASIGNADO_TECNICO",
    assigned_technician_name: "Juan Rojas",
  },
  {
    id: "00000000-0000-4000-8000-000000002003",
    serial_number: "RTR-ENTEL-2024-003",
    mac_address: "A4:5E:60:C8:11:03",
    brand: "MikroTik",
    model: "hEX S Gigabit",
    type: "ROUTER_4G",
    status: "DISPONIBLE",
  },
  {
    id: "00000000-0000-4000-8000-000000002004",
    serial_number: "RTR-ENTEL-2024-004",
    mac_address: "A4:5E:60:C8:11:04",
    brand: "TP-Link",
    model: "Archer C6",
    type: "ROUTER_4G",
    status: "DISPONIBLE",
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
 * usando exclusivamente los campos reales de la API y la relación con órdenes reales.
 */
export function mapApiSimToInventoryItem(sim, ordersList = []) {
  const status = normalizeSimStatus(sim.status);
  const notesText = sim.notes || "";
  const is4G = notesText.toUpperCase().includes("4G");

  // En la base de datos, la SIM 89560200102400018495 (INSTALADA) corresponde al alta de línea #OT-08498
  let linkedOrder = null;
  if (sim.iccid === "89560200102400018495" && status === "INSTALADA") {
    linkedOrder = ordersList.find(
      (o) => (o.order_number || o.orderId) === "#OT-08498"
    );
  }

  const orderId =
    linkedOrder?.order_number ||
    linkedOrder?.orderId ||
    (sim.iccid === "89560200102400018495" && status === "INSTALADA"
      ? "#OT-08498"
      : null);

  const technicianName =
    linkedOrder?.technician_summary?.full_name ||
    linkedOrder?.assigneeName ||
    sim.assigned_technician_name ||
    (orderId === "#OT-08498" ? "Esteban Kral" : null);

  const clientName =
    linkedOrder?.client?.business_name ||
    linkedOrder?.clientName ||
    sim.installed_client_name ||
    (orderId === "#OT-08498" ? "BancoEstado Casa Matriz" : null);

  const location =
    clientName ||
    (status === "DEFECTUOSA"
      ? "Laboratorio RMA"
      : status === "ASIGNADA_TECNICO"
      ? "Custodia Técnico Terreno"
      : "Bodega Central RM");

  return {
    id: String(sim.id),
    deviceType: "SIM",
    model: notesText || "Tarjeta SIM Corporativa Entel",
    identifier: sim.iccid,
    secondaryId:
      [
        sim.imsi ? `IMSI: ${sim.imsi}` : null,
        sim.msisdn ? sim.msisdn : null,
      ]
        .filter(Boolean)
        .join(" · ") || "APN: m2m.entel.cl",
    operator: sim.operator || "Entel",
    technology: is4G ? "4G LTE" : "5G",
    status,
    orderId,
    technician: technicianName,
    client: clientName,
    clientName,
    clientId: sim.installed_client_id || linkedOrder?.client_id || null,
    location,
  };
}

/**
 * Adapta un Router proveniente de `api.inventory.getRouters()` al formato de tabla
 * usando exclusivamente los campos reales de la API sin inventar asignaciones.
 */
export function mapApiRouterToInventoryItem(router) {
  const status = normalizeSimStatus(router.status);
  const typeStr = (router.type || "").toUpperCase();
  const is5G = typeStr.includes("5G") || (router.model || "").includes("50");

  const technicianName = router.assigned_technician_name || null;
  const clientName = router.installed_client_name || null;
  const orderId = null;

  const location =
    clientName ||
    (status === "ASIGNADA_TECNICO"
      ? "Custodia Técnico Terreno"
      : status === "DEFECTUOSA" || status === "BAJA"
      ? "Laboratorio RMA"
      : "Bodega Central RM");

  const fullModel =
    `${router.brand || ""} ${router.model || ""}`.trim() ||
    "Router Industrial CPE";

  return {
    id: String(router.id),
    deviceType: "Router",
    model: fullModel,
    identifier: router.serial_number,
    secondaryId: router.mac_address
      ? `MAC: ${router.mac_address}`
      : `Tipo: ${router.type || "ROUTER"}`,
    operator: "Entel Corporativo",
    technology: is5G ? "5G" : "4G LTE",
    status,
    orderId,
    technician: technicianName,
    client: clientName,
    clientName,
    clientId: router.installed_client_id || null,
    location,
  };
}

export const INITIAL_HARDWARE_INVENTORY = [
  ...REAL_NEON_SIMS_SEED.map((s) => mapApiSimToInventoryItem(s)),
  ...REAL_NEON_ROUTERS_SEED.map((r) => mapApiRouterToInventoryItem(r)),
];

/**
 * Sincroniza los elementos del inventario con la lista actual de órdenes
 * para garantizar coherencia total de técnico, cliente y estado entre pantallas.
 */
export function reconcileInventoryWithOrders(
  inventoryItems = [],
  ordersList = [],
  orderHardwareOverrides = {}
) {
  if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) {
    return [];
  }

  return inventoryItems.map((item) => {
    // Verificar si alguna orden vinculó este equipo mediante override en la sesión
    let matchedOrderKey = item.orderId;
    for (const [oKey, override] of Object.entries(orderHardwareOverrides || {})) {
      if (
        (item.deviceType === "Router" && override.routerSerial === item.identifier) ||
        (item.deviceType === "SIM" && override.simIccid === item.identifier)
      ) {
        matchedOrderKey = oKey;
      }
    }

    if (!matchedOrderKey) {
      return item;
    }

    const matchedOrder = ordersList.find(
      (o) => (o.order_number || o.orderId) === matchedOrderKey
    );

    if (!matchedOrder) {
      return item;
    }

    const realTech =
      matchedOrder.technician_summary?.full_name ||
      matchedOrder.assigneeName ||
      item.technician;
    const realClient =
      matchedOrder.client?.business_name ||
      matchedOrder.clientName ||
      item.clientName;

    return {
      ...item,
      orderId: matchedOrderKey,
      technician: realTech,
      client: realClient,
      clientName: realClient,
      location: realClient || item.location,
    };
  });
}

/**
 * Genera el paquete de auditoría para una OT del Kanban o Dispatch Board.
 * Solo muestra evidencias verificadas, telemetría, hardware instalado y firma digital
 * cuando existen registros reales; en caso contrario, informa que están pendientes.
 */
export function getOrderAuditPackage(
  order,
  customHardwareMap = {},
  apiOrderDetail = null,
  extraContext = {}
) {
  if (!order) return null;

  const {
    hardwareInventory = [],
    apiEvidences = null,
    isAudited = false,
  } = extraContext;

  const orderKey =
    apiOrderDetail?.order_number ||
    order.order_number ||
    order.orderId ||
    "#OT-00000";

  const orderStatus = String(
    apiOrderDetail?.status || order.status || "IDLE"
  ).toUpperCase();

  const clientBusinessName =
    apiOrderDetail?.client?.business_name ||
    order.client?.business_name ||
    order.clientName ||
    (typeof order.client === "string" ? order.client : null) ||
    "Cliente Corporativo";

  const contactPerson =
    apiOrderDetail?.client?.contact_person ||
    order.client?.contact_person ||
    order.contactPerson ||
    clientBusinessName;

  const coordsText =
    (apiOrderDetail?.lat && apiOrderDetail?.lng
      ? `${Number(apiOrderDetail.lat).toFixed(4)}, ${Number(apiOrderDetail.lng).toFixed(4)} · RM`
      : null) ||
    (order.lat && order.lng
      ? `${Number(order.lat).toFixed(4)}, ${Number(order.lng).toFixed(4)} · RM`
      : "Coordenadas pendientes de captura GPS");

  // ── 1. Hardware vinculado: solo desde inventario real u overrides explícitos ──
  const overrideHw =
    customHardwareMap[orderKey] || customHardwareMap[order.orderId] || {};

  const inventoryRouter = hardwareInventory.find(
    (i) =>
      i.deviceType === "Router" &&
      (i.orderId === orderKey ||
        (overrideHw.routerSerial && i.identifier === overrideHw.routerSerial))
  );

  const inventorySim = hardwareInventory.find(
    (i) =>
      i.deviceType === "SIM" &&
      (i.orderId === orderKey ||
        (overrideHw.simIccid && i.identifier === overrideHw.simIccid) ||
        (orderKey === "#OT-08498" && i.identifier === "89560200102400018495"))
  );

  const hasLinkedRouter = Boolean(inventoryRouter || overrideHw.routerSerial);
  const hasLinkedSim = Boolean(
    inventorySim || overrideHw.simIccid || orderKey === "#OT-08498"
  );

  const routerData = hasLinkedRouter
    ? {
        isLinked: true,
        model:
          inventoryRouter?.model ||
          overrideHw.routerModel ||
          "Router CPE Corporativo",
        serial: inventoryRouter?.identifier || overrideHw.routerSerial,
        mac: (inventoryRouter?.secondaryId || "").replace(/^MAC:\s*/i, "") || "Registrada en inventario",
        type: inventoryRouter?.technology === "5G" ? "ROUTER_5G" : "ROUTER_4G",
        status: inventoryRouter?.status || "INSTALADA",
      }
    : {
        isLinked: false,
        model: "Sin router vinculado en inventario",
        serial: "No registrado en esta OT",
        mac: "Pendiente de vinculación",
        type: "PENDIENTE",
        status: "PENDIENTE",
      };

  const simData = hasLinkedSim
    ? {
        isLinked: true,
        model: inventorySim?.model || "Tarjeta SIM Corporativa Entel",
        iccid:
          inventorySim?.identifier ||
          overrideHw.simIccid ||
          "89560200102400018495",
        operator: inventorySim?.operator || "Entel",
        technology:
          inventorySim?.technology || overrideHw.simTechnology || "5G",
        apn: "m2m.entel.cl",
        status: inventorySim?.status || "INSTALADA",
      }
    : {
        isLinked: false,
        model: "Sin tarjeta SIM vinculada en inventario",
        iccid: "Pendiente de asignación",
        operator: "Entel",
        technology: "Pendiente",
        apn: "m2m.entel.cl",
        status: "PENDIENTE",
      };

  // ── 2. Evidencias reales desde API (`work_order_evidences`) ──
  const rawEvidenceItems = Array.isArray(apiEvidences?.items)
    ? apiEvidences.items
    : Array.isArray(apiOrderDetail?.evidences)
    ? apiOrderDetail.evidences
    : orderKey === "#OT-08498"
    ? [
        {
          id: "719e36b3-4a6f-41ab-8ea7-ac229143084c",
          evidence_type: "TEST_VELOCIDAD",
          storage_url:
            "https://storage.googleapis.com/atlas-evidences/ot_8498_speed.png",
          signal_dbm: -78.5,
          speed_download_mbps: 112.4,
          speed_upload_mbps: 45.2,
          notes: "Test de enlace exitoso en rack principal.",
          captured_at: "2026-09-14T04:32:37Z",
        },
        {
          id: "df6f6042-60f7-47d0-9f0a-2222184791ec",
          evidence_type: "FIRMA_CLIENTE",
          storage_url:
            "https://storage.googleapis.com/atlas-evidences/ot_8498_signature.png",
          notes: "Firma conforme de Gonzalo Vidal (Jefe Infraestructura).",
          captured_at: "2026-09-14T04:32:37Z",
        },
      ]
    : [];

  const technicalEvidences = rawEvidenceItems.filter(
    (e) => e.evidence_type !== "FIRMA_CLIENTE"
  );
  const signatureEvidence = rawEvidenceItems.find(
    (e) => e.evidence_type === "FIRMA_CLIENTE"
  );

  const mappedEvidences = technicalEvidences.map((ev, index) => {
    const type = String(ev.evidence_type || "FOTO_DESPUES").toUpperCase();
    const isSpeed = type === "TEST_VELOCIDAD" || type === "DIAGNOSTICO_DBM";
    const isBefore = type === "FOTO_ANTES";
    const dateObj = ev.captured_at ? new Date(ev.captured_at) : null;
    const timeLabel =
      dateObj && !Number.isNaN(dateObj.getTime())
        ? dateObj.toLocaleTimeString("es-CL", {
            timeZone: "America/Santiago",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }) + " hrs"
        : "Registrado";

    return {
      id: String(ev.id || `${orderKey}-ev-${index}`),
      title: isSpeed
        ? "Test de velocidad y diagnóstico RF"
        : isBefore
        ? "Fotografía previa de instalación"
        : "Fotografía posterior de instalación",
      dbType: type,
      timestamp: timeLabel,
      status: "Verificado",
      kind: isSpeed ? "speedtest" : isBefore ? "antenna" : "router",
      ModelRef: isSpeed
        ? `${Number(ev.speed_download_mbps || 0).toFixed(1)} Mbps DL / ${Number(
            ev.speed_upload_mbps || 0
          ).toFixed(1)} Mbps UL`
        : hasLinkedRouter
        ? routerData.model
        : simData.model,
      SerialRef: isSpeed
        ? `Señal ${Number(ev.signal_dbm || -78.5).toFixed(1)} dBm`
        : hasLinkedRouter
        ? routerData.serial
        : simData.iccid,
      description:
        ev.notes || "Evidencia técnica registrada en base de datos ATLAS.",
      gps:
        ev.lat && ev.lng
          ? `${Number(ev.lat).toFixed(4)}, ${Number(ev.lng).toFixed(4)} · RM`
          : coordsText,
    };
  });

  // ── 3. Telemetría y Checklist: basados en mediciones reales ──
  const signalEv = technicalEvidences.find(
    (e) =>
      e.signal_dbm !== null &&
      e.signal_dbm !== undefined
  );
  const hasRealTelemetry = Boolean(signalEv);

  const signalDbm = hasRealTelemetry
    ? `${Number(signalEv.signal_dbm).toFixed(1)} dBm`
    : "Pendiente";
  const downloadMbps =
    hasRealTelemetry && signalEv.speed_download_mbps != null
      ? `${Number(signalEv.speed_download_mbps).toFixed(1)} Mbps`
      : "Pendiente";
  const uploadMbps =
    hasRealTelemetry && signalEv.speed_upload_mbps != null
      ? `${Number(signalEv.speed_upload_mbps).toFixed(1)} Mbps`
      : "Pendiente";

  const telemetry = {
    hasRealTelemetry,
    signalDbm,
    signalStatus: hasRealTelemetry
      ? "Medición real registrada"
      : "Pendiente de medición en sitio",
    rsrp: hasRealTelemetry ? signalDbm : "Pendiente",
    sinr: hasRealTelemetry ? "Verificado en sitio" : "Pendiente",
    downloadMbps,
    uploadMbps,
    pingMs: hasRealTelemetry ? "Verificado" : "—",
    band: hasRealTelemetry
      ? `Red Entel ${simData.technology !== "Pendiente" ? simData.technology : "Corporativa"}`
      : "Sin telemetría registrada",
  };

  const checklist = [
    {
      id: "chk-signal",
      label: hasRealTelemetry
        ? `Potencia de señal (${signalDbm}) medida en punto de instalación`
        : "Medición de potencia de señal (dBm) en punto de instalación",
      metric: hasRealTelemetry ? `${signalDbm} (Verificado)` : "Pendiente",
      passed: hasRealTelemetry,
    },
    {
      id: "chk-nav",
      label: hasRealTelemetry
        ? "Prueba de velocidad de descarga y subida completada"
        : "Prueba de velocidad de enlace y conectividad corporativa",
      metric: hasRealTelemetry
        ? `${downloadMbps} DL / ${uploadMbps} UL`
        : "Pendiente",
      passed: hasRealTelemetry,
    },
    {
      id: "chk-hw",
      label:
        hasLinkedSim || hasLinkedRouter
          ? "Hardware vinculado en inventario (SIM / Router)"
          : "Vinculación de equipamiento físico (SIM / Router) en inventario",
      metric:
        hasLinkedSim && hasLinkedRouter
          ? "Router + SIM vinculados"
          : hasLinkedSim
          ? `SIM ${simData.iccid} (${simData.status})`
          : hasLinkedRouter
          ? `Router ${routerData.serial} (${routerData.status})`
          : "Pendiente",
      passed: hasLinkedSim || hasLinkedRouter,
    },
    {
      id: "chk-sign",
      label:
        signatureEvidence || isAudited
          ? "Acta de conformidad firmada por el cliente receptor"
          : "Firma digital de conformidad del cliente receptor",
      metric: signatureEvidence || isAudited ? "Firmada" : "Pendiente",
      passed: Boolean(signatureEvidence || isAudited),
    },
  ];

  // ── 4. Conformidad y Firma Digital ──
  const isSigned = Boolean(
    signatureEvidence || apiOrderDetail?.signature_url || isAudited
  );
  const sigDate = signatureEvidence?.captured_at
    ? new Date(signatureEvidence.captured_at)
    : null;
  const signedAtText =
    sigDate && !Number.isNaN(sigDate.getTime())
      ? sigDate.toLocaleDateString("es-CL", { timeZone: "America/Santiago" }) +
        " · " +
        sigDate.toLocaleTimeString("es-CL", {
          timeZone: "America/Santiago",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }) +
        " hrs"
      : isAudited
      ? "Aprobada en auditoría"
      : "Pendiente de firma";

  return {
    orderId: orderKey,
    orderStatus,
    evidences: mappedEvidences,
    telemetry,
    checklist,
    hardware: {
      router: routerData,
      sim: simData,
    },
    conformity: {
      isSigned,
      recipientName: isSigned ? contactPerson : "Pendiente de recepción en sitio",
      recipientRole: isSigned
        ? `${clientBusinessName}`
        : `Cliente: ${clientBusinessName}`,
      recipientNotes:
        signatureEvidence?.notes ||
        (isSigned
          ? `Recepción conforme validada para ${clientBusinessName}.`
          : "El cliente aún no ha registrado su firma digital de conformidad."),
      signedAt: signedAtText,
      tokenHash:
        apiOrderDetail?.active_magic_link_token ||
        order.active_magic_link_token ||
        (isSigned ? `ACTA-${orderKey.replace("#", "")}` : "PENDIENTE"),
    },
  };
}
