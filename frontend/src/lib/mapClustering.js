/**
 * frontend/src/lib/mapClustering.js
 *
 * Utilidades de geolocalización, agrupación de marcadores (clustering por coordenadas exactas),
 * filtros por estado y trazabilidad para el mapa geoespacial del Dashboard de ATLAS FSM.
 */

export const ORDER_STATUS_COLORS = {
  CONFIRMADA: "#3b82f6", // Azul
  ASIGNADA: "#3b82f6",   // Azul (equivalente a confirmada/asignada)
  EN_RUTA: "#f97316",    // Naranja
  EN_SITIO: "#8b5cf6",   // Púrpura / Violeta (diferenciado de EN_RUTA)
  COMPLETADA: "#10b981", // Verde esmeralda
  CANCELADA: "#ef4444",  // Rojo / Rosado
  IDLE: "#64748b",       // Pizarra / Pendiente
};

export const AVAILABLE_STATUS_FILTERS = [
  { id: "TODAS", label: "Todas", color: "#64748b" },
  { id: "CONFIRMADA", label: "Confirmada", color: ORDER_STATUS_COLORS.CONFIRMADA },
  { id: "EN_RUTA", label: "En ruta", color: ORDER_STATUS_COLORS.EN_RUTA },
  { id: "EN_SITIO", label: "En sitio", color: ORDER_STATUS_COLORS.EN_SITIO },
  { id: "COMPLETADA", label: "Completada", color: ORDER_STATUS_COLORS.COMPLETADA },
  { id: "CANCELADA", label: "Cancelada", color: ORDER_STATUS_COLORS.CANCELADA },
];

/**
 * Valida si un par de coordenadas es numéricamente válido y cae dentro de los límites geográficos.
 */
export function isValidCoordinate(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  const nLat = typeof lat === "number" ? lat : parseFloat(lat);
  const nLng = typeof lng === "number" ? lng : parseFloat(lng);
  if (isNaN(nLat) || isNaN(nLng)) return false;
  return nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
}

/**
 * Extrae y normaliza las coordenadas de una orden con fallback al cliente.
 */
export function extractOrderCoordinates(order) {
  if (!order) return { lat: null, lng: null, isValid: false };
  const rawLat = order.lat ?? order.client?.lat;
  const rawLng = order.lng ?? order.client?.lng;
  if (!isValidCoordinate(rawLat, rawLng)) {
    return { lat: null, lng: null, isValid: false };
  }
  return {
    lat: typeof rawLat === "number" ? rawLat : parseFloat(rawLat),
    lng: typeof rawLng === "number" ? rawLng : parseFloat(rawLng),
    isValid: true,
  };
}

/**
 * Determina el color hexadecimal del marcador según el estado de la orden.
 */
export function getMarkerHexByStatus(status, fallbackHex) {
  if (fallbackHex) return fallbackHex;
  const s = (status || "").toUpperCase();
  if (ORDER_STATUS_COLORS[s]) return ORDER_STATUS_COLORS[s];
  if (s.includes("SITIO")) return ORDER_STATUS_COLORS.EN_SITIO;
  if (s.includes("RUTA") || s.includes("CAMINO") || s.includes("TRANSITO")) return ORDER_STATUS_COLORS.EN_RUTA;
  if (s.includes("COMPLET")) return ORDER_STATUS_COLORS.COMPLETADA;
  if (s.includes("CANCEL")) return ORDER_STATUS_COLORS.CANCELADA;
  if (s.includes("CONFIRM") || s.includes("ASIGN")) return ORDER_STATUS_COLORS.CONFIRMADA;
  return "#3b82f6";
}

/**
 * Normaliza un objeto de orden para uso dentro del mapa y sus ventanas de detalle.
 */
export function normalizeOrderForMap(order) {
  const coords = extractOrderCoordinates(order);
  const orderNumber = order.order_number || order.orderNumber || order.id || "OT-???";
  const clientName =
    order.client?.business_name ||
    order.client?.name ||
    order.clientName ||
    order.client ||
    "Cliente Corporativo";
  const title = order.title || order.service || order.label || "Servicio técnico en terreno";
  const status = (order.status || "IDLE").toUpperCase();

  return {
    ...order,
    id: order.id || orderNumber,
    orderNumber,
    client: clientName,
    title,
    status,
    lat: coords.lat,
    lng: coords.lng,
    hasValidLocation: coords.isValid,
  };
}

/**
 * Agrupa órdenes geolocalizables que comparten la misma ubicación geográfica exacta.
 * Evita superposición de pines en Leaflet y permite desplegar una lista interactiva.
 *
 * @param {Array} rawOrders - Lista de órdenes recibidas del backend
 * @param {string|null} statusFilter - Filtro de estado ("TODAS", "COMPLETADA", etc.)
 * @returns {Object} { clusters, geocodedOrders, unlocatedOrders, totalOrders }
 */
export function groupOrdersIntoClusters(rawOrders = [], statusFilter = null) {
  if (!Array.isArray(rawOrders)) {
    return { clusters: [], geocodedOrders: [], unlocatedOrders: [], totalOrders: 0 };
  }

  const normalized = rawOrders.map(normalizeOrderForMap);

  // Aplicar filtro de estado si está activo
  const filtered =
    statusFilter && statusFilter !== "TODAS"
      ? normalized.filter((o) => (o.status || "").toUpperCase() === statusFilter.toUpperCase())
      : normalized;

  const geocodedOrders = [];
  const unlocatedOrders = [];
  const clusterMap = new Map();

  for (const order of filtered) {
    if (!order.hasValidLocation) {
      unlocatedOrders.push(order);
      continue;
    }

    geocodedOrders.push(order);

    // Llave de coordenadas con 5 decimales (~1.1 metros de precisión) para agrupar únicamente
    // órdenes con ubicación física idéntica o equivalente, sin agrupar direcciones distintas.
    const key = `${order.lat.toFixed(5)},${order.lng.toFixed(5)}`;

    if (!clusterMap.has(key)) {
      clusterMap.set(key, {
        id: `cluster-${key}`,
        key,
        lat: order.lat,
        lng: order.lng,
        orders: [],
      });
    }

    clusterMap.get(key).orders.push(order);
  }

  // Enriquecer cada cluster con conteos y colores representativos
  const clusters = Array.from(clusterMap.values()).map((c) => {
    const count = c.orders.length;
    const isCluster = count > 1;

    // Verificar si todas las órdenes tienen el mismo estado
    const statuses = new Set(c.orders.map((o) => o.status));
    const isSingleStatus = statuses.size === 1;
    const primaryStatus = isSingleStatus ? Array.from(statuses)[0] : "MIXTO";
    const color = isSingleStatus ? getMarkerHexByStatus(primaryStatus) : "#ea580c";

    return {
      ...c,
      count,
      isCluster,
      primaryStatus,
      color,
    };
  });

  return {
    clusters,
    geocodedOrders,
    unlocatedOrders,
    totalOrders: filtered.length,
  };
}

/**
 * Calcula los contadores precisos para el encabezado y estado del mapa.
 */
export function getMapSummaryCounters(rawOrders = [], technicianMarkers = [], statusFilter = null) {
  const { geocodedOrders, unlocatedOrders } = groupOrdersIntoClusters(rawOrders, statusFilter);
  const geocodedCount = geocodedOrders.length;
  const unlocatedCount = unlocatedOrders.length;
  const techGpsCount = Array.isArray(technicianMarkers) ? technicianMarkers.length : 0;

  const summaryText = `${geocodedCount} ${
    geocodedCount === 1 ? "orden geolocalizada" : "órdenes geolocalizadas"
  } · ${techGpsCount} ${techGpsCount === 1 ? "técnico con GPS activo" : "técnicos con GPS activo"}`;

  const unlocatedText =
    unlocatedCount > 0
      ? `${unlocatedCount} ${unlocatedCount === 1 ? "orden sin ubicación" : "órdenes sin ubicación"}`
      : null;

  return {
    geocodedCount,
    unlocatedCount,
    techGpsCount,
    summaryText,
    unlocatedText,
    unlocatedOrders,
  };
}

/**
 * Evalúa la vigencia de la última señal de GPS de un técnico.
 */
export function getSignalFreshness(lastLocationAt) {
  if (!lastLocationAt) return { label: "Sin señal registrada", isRecent: false, isStale: false };
  const diffMinutes = Math.floor((Date.now() - new Date(lastLocationAt).getTime()) / 60000);
  if (diffMinutes < 5) {
    return {
      label: diffMinutes <= 0 ? "En vivo (ahora)" : `En vivo (hace ${diffMinutes} min)`,
      isRecent: true,
      isStale: false,
    };
  } else if (diffMinutes < 30) {
    return {
      label: `Señal hace ${diffMinutes} min`,
      isRecent: false,
      isStale: true,
    };
  } else {
    return {
      label: `Sin señal reciente (${diffMinutes} min)`,
      isRecent: false,
      isStale: false,
    };
  }
}

/**
 * Genera el icono visual Leaflet para un marcador individual.
 */
export function makeSingleOrderIcon(hex, LInstance) {
  const Leaflet = LInstance || (typeof window !== "undefined" ? window.L : null);
  if (!Leaflet?.divIcon) return null;

  return Leaflet.divIcon({
    className: "atlas-single-marker",
    html: `
      <div style="
        position: relative;
        width: 20px; height: 20px;
        border-radius: 9999px;
        background: ${hex};
        border: 2.5px solid #ffffff;
        box-shadow: 0 0 0 3px ${hex}40, 0 2px 6px rgba(0,0,0,0.35);
        cursor: pointer;
      "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
}

/**
 * Genera el icono visual Leaflet para un cluster de múltiples órdenes en la misma ubicación.
 */
export function makeClusterIcon(count, hex, LInstance) {
  const Leaflet = LInstance || (typeof window !== "undefined" ? window.L : null);
  if (!Leaflet?.divIcon) return null;

  return Leaflet.divIcon({
    className: "atlas-cluster-marker",
    html: `
      <div style="
        position: relative;
        width: 32px; height: 32px;
        border-radius: 9999px;
        background: ${hex};
        border: 2.5px solid #ffffff;
        box-shadow: 0 0 0 4px ${hex}44, 0 3px 8px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        color: #ffffff;
        font-weight: 800;
        font-size: 13px;
        font-family: system-ui, -apple-system, sans-serif;
        cursor: pointer;
        transition: transform 0.15s ease;
      ">
        <span>${count}</span>
      </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

/**
 * Genera el icono de técnico con GPS en vivo y anillo de vigencia.
 */
export function makeTechnicianIcon({ isRecent, isStale, initials = "TC" }, LInstance) {
  const Leaflet = LInstance || (typeof window !== "undefined" ? window.L : null);
  if (!Leaflet?.divIcon) return null;

  const ringColor = isRecent ? "#10b981" : isStale ? "#f59e0b" : "#64748b";
  const glow = isRecent ? `box-shadow: 0 0 8px ${ringColor};` : "";

  return Leaflet.divIcon({
    className: "atlas-technician-marker",
    html: `
      <div style="
        position: relative;
        width: 28px; height: 28px;
        border-radius: 9999px;
        background: #0f172a;
        border: 2px solid ${ringColor};
        ${glow}
        display: flex; align-items: center; justify-content: center;
        color: #ffffff; font-weight: 700; font-size: 11px; font-family: monospace;
        cursor: pointer;
      ">
        <span>${initials}</span>
        <span style="
          position: absolute; bottom: -2px; right: -2px;
          width: 8px; height: 8px; border-radius: 9999px;
          background: ${ringColor};
          border: 1.5px solid #0f172a;
        "></span>
      </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}
